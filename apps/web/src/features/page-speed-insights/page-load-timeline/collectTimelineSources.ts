import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import type { TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import {
  type TimelineClock,
  createTimelineClock,
  resolveSimulatedThrottling,
} from "./simulatedThrottling";
import type {
  CriticalChainNode,
  ScriptCpu,
} from "@/features/page-speed-insights/shared/scriptResourceFacts";
import type {
  CodeCoverage,
  CombinedLoad,
  CombinedLongTask,
  CombinedRequest,
  RawLongTask,
  RawNetworkRequest,
} from "./timelineSourceTypes";
import {
  auditItems,
  filmstripFrames,
  mainDocument,
  metricsItem,
  networkRequests,
  ratingFor,
} from "./auditReaders";
import { downloadBlockingStatus, renderBlocking, textBlockingUrls } from "./renderBlockingSources";
import {
  codeCoverageByUrl,
  coverageFor,
  coverageKeys,
  isCodeResource,
} from "./codeCoverageSources";
import {
  bootupCpuByUrl,
  lookupKeyed,
  parseDependencyTree,
  redirectHops,
} from "./criticalChainSources";
import { longTasks } from "./longTaskSources";
import { buildLcpSegments, lcpDiscoveryFailures, lcpElementNode, lcpSubparts } from "./lcpSources";
import { layoutShifts, userTimings } from "./userExperienceSources";
import { observedTraceTtfb, traceTimeToFirstByte } from "./ttfbSources";

export type {
  PreconnectCandidate,
  UserTiming,
  LayoutShiftEvent,
  CombinedRequest,
  CombinedLongTask,
  CombinedLoad,
} from "./timelineSourceTypes";

export function urlsMatch(left: string, right: string): boolean {
  const keys = new Set(coverageKeys(left));
  return coverageKeys(right).some((key) => keys.has(key));
}

function isScriptDownload(request: RawNetworkRequest): boolean {
  if (request.resourceType === "Script") return true;
  if (request.mimeType?.includes("javascript")) return true;
  return !request.resourceType && !request.mimeType;
}

function closestScriptDownload(
  requests: RawNetworkRequest[],
  taskStartMs: number,
): RawNetworkRequest | undefined {
  if (!requests.length) return undefined;
  const finished = requests.filter(
    (request) => request.networkEndTime != null && request.networkEndTime <= taskStartMs + 1,
  );
  const candidates = finished.length > 0 ? finished : requests;
  return [...candidates].sort((a, b) => {
    const aEnd = a.networkEndTime ?? a.networkRequestTime ?? 0;
    const bEnd = b.networkEndTime ?? b.networkRequestTime ?? 0;
    return Math.abs(taskStartMs - aEnd) - Math.abs(taskStartMs - bEnd);
  })[0];
}

function toCombinedRequest(
  request: RawNetworkRequest,
  blockingUrlSet: Set<string>,
  textBlockingUrlSet: Set<string>,
  chainUrlSet: Set<string>,
  coverageByUrl: Map<string, CodeCoverage>,
  cpuByUrl: Map<string, ScriptCpu>,
  chainByUrl: Map<string, CriticalChainNode>,
): CombinedRequest | null {
  if (request.networkRequestTime == null || request.networkEndTime == null) return null;
  const chain = lookupKeyed(chainByUrl, request.url);
  const scriptCpu = lookupKeyed(cpuByUrl, request.url);
  return {
    url: request.url,
    resourceType: request.resourceType,
    networkRequestTime: request.networkRequestTime,
    networkEndTime: request.networkEndTime,
    rendererStartTime: request.rendererStartTime,
    transferSize: request.transferSize,
    resourceSize: request.resourceSize,
    statusCode: request.statusCode,
    protocol: request.protocol,
    mimeType: request.mimeType,
    isLinkPreload: request.isLinkPreload,
    entity: request.entity,
    priority: request.priority,
    renderBlocking: downloadBlockingStatus(request, blockingUrlSet, textBlockingUrlSet),
    isCriticalChain: chainUrlSet.has(request.url) || chain != null,
    coverage: isCodeResource(request.resourceType)
      ? coverageFor(coverageByUrl, request.url)
      : undefined,
    ...(scriptCpu ? { scriptCpu } : {}),
    ...(chain ? { chain } : {}),
  };
}

function enrichLongTask(
  task: RawLongTask,
  requests: RawNetworkRequest[],
  coverageByUrl: Map<string, CodeCoverage>,
  cpuByUrl: Map<string, ScriptCpu>,
  chainByUrl: Map<string, CriticalChainNode>,
): CombinedLongTask {
  const scriptCpu = task.url ? lookupKeyed(cpuByUrl, task.url) : undefined;
  const chain = task.url ? lookupKeyed(chainByUrl, task.url) : undefined;
  const base: CombinedLongTask = {
    url: task.url,
    startTime: task.startTime,
    duration: task.duration,
    ...(scriptCpu ? { scriptCpu } : {}),
    ...(chain ? { chain } : {}),
  };
  if (!task.url) return base;

  const request = closestScriptDownload(
    requests.filter((item) => urlsMatch(item.url, task.url!) && isScriptDownload(item)),
    task.startTime,
  );
  const coverage = coverageFor(coverageByUrl, task.url);
  const bytes = request?.transferSize ?? request?.resourceSize;
  const startMs = request?.networkRequestTime;
  const endMs = request?.networkEndTime;
  const hasWindow = startMs != null && endMs != null;

  return {
    ...base,
    scriptTransferBytes: bytes,
    downloadStartMs: hasWindow ? startMs : undefined,
    downloadEndMs: hasWindow ? endMs : undefined,
    coverage,
  };
}

/** Parse audits, apply the simulation clock, and join related facts onto one record. */
export function collectTimelineSources(source: InsightsContextItem): CombinedLoad | null {
  const audits = source.item?.lighthouseResult?.audits;
  if (!audits) return null;

  const metrics = metricsItem(audits);
  if (!metrics) return null;

  const rawRequests = networkRequests(audits);
  const serverThink = getNumber(audits["server-response-time"]?.numericValue);
  const documentRaw = mainDocument(rawRequests);
  const observedTtfb = observedTraceTtfb(metrics, documentRaw, serverThink);
  const simulatedTtfb = getNumber(metrics.timeToFirstByte);
  const throttling = resolveSimulatedThrottling(source.item?.lighthouseResult?.configSettings);
  const clock: TimelineClock | null = throttling
    ? createTimelineClock({
        throttling,
        observedTtfb,
        simulatedTtfb,
        observedFcp: getNumber(metrics.observedFirstContentfulPaint),
        simulatedFcp: getNumber(metrics.firstContentfulPaint),
        observedLcp: getNumber(metrics.observedLargestContentfulPaint),
        simulatedLcp: getNumber(metrics.largestContentfulPaint),
        documentServerLatencyMs: serverThink,
      })
    : null;

  const mapMs = (value: number | undefined): number | undefined => {
    if (value == null) return undefined;
    return clock ? clock.mapTime(value) : value;
  };
  const pickSimulated = (simulated: unknown, observed: unknown): number | undefined => {
    const sim = getNumber(simulated);
    if (clock && sim != null) return sim;
    return mapMs(getNumber(observed));
  };

  const fcp = pickSimulated(metrics.firstContentfulPaint, metrics.observedFirstContentfulPaint);
  const lcp = pickSimulated(metrics.largestContentfulPaint, metrics.observedLargestContentfulPaint);
  const observedFcp = mapMs(getNumber(metrics.observedFirstContentfulPaint));
  const observedLcp = mapMs(getNumber(metrics.observedLargestContentfulPaint));
  const observedFcpAllFrames = mapMs(getNumber(metrics.observedFirstContentfulPaintAllFrames));
  const observedLcpAllFrames = mapMs(getNumber(metrics.observedLargestContentfulPaintAllFrames));
  const firstPaint = mapMs(getNumber(metrics.observedFirstPaint));
  const firstVisual = mapMs(getNumber(metrics.observedFirstVisualChange));
  const dcl = mapMs(getNumber(metrics.observedDomContentLoaded));
  const load = mapMs(getNumber(metrics.observedLoad));
  const lastVisual = mapMs(getNumber(metrics.observedLastVisualChange));
  const interactive = getNumber(metrics.interactive);
  const traceEnd = mapMs(getNumber(metrics.observedTraceEnd));

  const requests = clock ? clock.adjustRequests(rawRequests) : rawRequests;
  const document = mainDocument(requests);
  const tracedTtfb = clock ? undefined : traceTimeToFirstByte(metrics, documentRaw, serverThink);
  const ttfb = clock ? (simulatedTtfb ?? mapMs(observedTtfb)) : tracedTtfb?.timeMs;
  const ttfbObserved = !clock && tracedTtfb?.observed === true;
  const screenshots = clock
    ? clock.adjustScreenshots(filmstripFrames(audits))
    : filmstripFrames(audits);
  const tasks = longTasks(audits, clock);
  const timings = userTimings(audits).map((timing) => {
    const startTime = mapMs(timing.startTime) ?? timing.startTime;
    if (timing.duration == null) return { ...timing, startTime };
    const endTime = mapMs(timing.startTime + timing.duration) ?? startTime + timing.duration;
    return { ...timing, startTime, duration: Math.max(0, endTime - startTime) };
  });
  const blocking = renderBlocking(audits);
  const subparts = clock
    ? clock.adjustLcpSubparts(lcpSubparts(audits), {
        simulatedTtfb,
        simulatedLcp: getNumber(metrics.largestContentfulPaint),
        loadDelay: getNumber(metrics.lcpLoadDelay),
        loadDuration: getNumber(metrics.lcpLoadDuration),
      })
    : lcpSubparts(audits);
  const lcpSegs = buildLcpSegments(subparts, lcp);
  const element = lcpElementNode(audits);
  const elementLabel = element?.nodeLabel ?? element?.snippet;
  const discoveryFailures = lcpDiscoveryFailures(audits);
  const shifts = layoutShifts(audits).map((shift) => ({
    ...shift,
    startTime: mapMs(shift.startTime) ?? shift.startTime,
  }));

  const depTree = parseDependencyTree(audits);
  const redirectAuditMs = getNumber(audits.redirects?.numericValue);
  const redirectItems = auditItems(audits, "redirects");
  const redirectAuditUrls = redirectItems
    .map((item) =>
      item && typeof item === "object" && "url" in item ? String((item as TableItem).url) : "",
    )
    .filter(Boolean);
  const chainUrlSet = new Set(depTree.chainUrls);
  const blockingUrlSet = new Set(blocking.map((b) => b.url));
  const textBlockingUrlSet = textBlockingUrls(audits);
  const coverageByUrl = codeCoverageByUrl(audits);
  const cpuByUrl = bootupCpuByUrl(audits);
  const chainByUrl = depTree.chainByUrl;

  const hops = redirectHops(requests, document, redirectAuditUrls);
  const hopSet = new Set(hops);

  const toCombined = (request: RawNetworkRequest) =>
    toCombinedRequest(
      request,
      blockingUrlSet,
      textBlockingUrlSet,
      chainUrlSet,
      coverageByUrl,
      cpuByUrl,
      chainByUrl,
    );

  const combinedHops = hops
    .map(toCombined)
    .filter((request): request is CombinedRequest => request != null);
  const combinedRequests = requests
    .filter((request) => !hopSet.has(request))
    .map(toCombined)
    .filter((request): request is CombinedRequest => request != null);
  const combinedDocument = document ? (toCombined(document) ?? undefined) : undefined;

  let serverStartMs: number | undefined;
  let serverEndMs: number | undefined;
  if (serverThink != null && document?.networkRequestTime != null) {
    serverStartMs =
      clock && ttfb != null ? Math.max(0, ttfb - serverThink) : document.networkRequestTime;
    serverEndMs = clock && ttfb != null ? ttfb : document.networkRequestTime + serverThink;
  }

  return {
    label: source.label,
    simulationLabel: clock?.throttling.label,
    fcp,
    lcp,
    observedFcp,
    observedLcp,
    observedFcpAllFrames,
    observedLcpAllFrames,
    firstPaint,
    firstVisual,
    dcl,
    load,
    lastVisual,
    interactive,
    traceEnd,
    ttfb,
    ttfbObserved,
    simulatedTtfb,
    serverThinkMs: serverThink,
    serverStartMs,
    serverEndMs,
    ttfbRating: ttfb != null ? ratingFor(ttfb, 800, 1800) : undefined,
    fcpRating: fcp != null ? ratingFor(fcp, 1800, 3000) : undefined,
    lcpRating: lcp != null ? ratingFor(lcp, 2500, 4000) : undefined,
    document: combinedDocument,
    requests: combinedRequests,
    redirectHops: combinedHops,
    redirectAuditMs,
    redirectAuditUrls,
    longestChainMs: depTree.longestChainMs,
    longTasks: tasks.map((task) =>
      enrichLongTask(task, requests, coverageByUrl, cpuByUrl, chainByUrl),
    ),
    userTimings: timings,
    screenshots,
    lcpElementLabel: elementLabel,
    lcpElement: element,
    lcpSegments: lcpSegs,
    lcpDiscoveryFailures: discoveryFailures,
    layoutShifts: shifts,
    preconnectedText: depTree.preconnectedText,
    preconnectCandidates: depTree.preconnectCandidates,
  };
}
