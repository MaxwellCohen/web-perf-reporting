import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import type { AuditResultsRecord, TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import {
  createTimelineClock,
  isNavigationRedirect,
  resolveSimulatedThrottling,
  type TimelineClock,
} from "./simulatedThrottling";
import type { LcpSegment, Rating, RenderBlockingStatus, ScreenshotFrame } from "./types";

type MetricsItem = Record<string, unknown>;

type RawNetworkRequest = {
  url: string;
  resourceType?: string;
  networkRequestTime?: number;
  networkEndTime?: number;
  transferSize?: number;
  resourceSize?: number;
  statusCode?: number;
  protocol?: string;
  mimeType?: string;
  isLinkPreload?: boolean;
  entity?: string;
  priority?: string;
  renderBlocking?: string;
};

type RawLongTask = {
  url?: string;
  startTime: number;
  duration: number;
};

type LcpSubpart = {
  subpart: string;
  label: string;
  duration: number;
};

export type PreconnectCandidate = {
  origin: string;
  wastedMs: number;
};

type RenderBlockingItem = {
  url: string;
  wastedMs?: number;
  totalBytes?: number;
};

export type UserTiming = {
  name: string;
  timingType: string;
  startTime: number;
  duration?: number;
};

export type LcpDiscoveryCheck = {
  id: string;
  label: string;
  value: boolean;
};

export type CodeCoverage = {
  totalBytes: number;
  wastedBytes: number;
};

export type CombinedRequest = {
  url: string;
  resourceType?: string;
  networkRequestTime: number;
  networkEndTime: number;
  transferSize?: number;
  resourceSize?: number;
  statusCode?: number;
  protocol?: string;
  mimeType?: string;
  isLinkPreload?: boolean;
  entity?: string;
  priority?: string;
  renderBlocking: RenderBlockingStatus;
  isCriticalChain: boolean;
  coverage?: CodeCoverage;
};

export type CombinedLongTask = {
  url?: string;
  startTime: number;
  duration: number;
  scriptTransferBytes?: number;
  downloadStartMs?: number;
  downloadEndMs?: number;
  coverage?: CodeCoverage;
};

export type CombinedLoad = {
  label: string;
  simulationLabel?: string;
  fcp?: number;
  lcp?: number;
  firstPaint?: number;
  firstVisual?: number;
  dcl?: number;
  load?: number;
  lastVisual?: number;
  interactive?: number;
  traceEnd?: number;
  ttfb?: number;
  ttfbObserved: boolean;
  simulatedTtfb?: number;
  serverThinkMs?: number;
  /** Server think window on the timeline clock, when known. */
  serverStartMs?: number;
  serverEndMs?: number;
  ttfbRating?: Rating;
  fcpRating?: Rating;
  lcpRating?: Rating;
  document?: CombinedRequest;
  requests: CombinedRequest[];
  redirectHops: CombinedRequest[];
  redirectAuditMs?: number;
  redirectAuditUrls: string[];
  longestChainMs?: number;
  longTasks: CombinedLongTask[];
  userTimings: UserTiming[];
  screenshots: ScreenshotFrame[];
  lcpElementLabel?: string;
  lcpSegments: LcpSegment[];
  lcpDiscoveryFailures: LcpDiscoveryCheck[];
  preconnectedText?: string;
  preconnectCandidates: PreconnectCandidate[];
};

function ratingFor(value: number, good: number, poor: number): Rating {
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

function auditItems(audits: AuditResultsRecord | undefined, id: string): unknown[] {
  const details = audits?.[id]?.details as { items?: unknown } | undefined;
  return Array.isArray(details?.items) ? details.items : [];
}

function metricsItem(audits: AuditResultsRecord | undefined): MetricsItem | undefined {
  const items = auditItems(audits, "metrics");
  const first = items[0];
  return first && typeof first === "object" ? (first as MetricsItem) : undefined;
}

function filmstripFrames(audits: AuditResultsRecord | undefined): ScreenshotFrame[] {
  const details = audits?.["screenshot-thumbnails"]?.details as
    | { type?: string; items?: Array<{ timing?: unknown; data?: unknown }> }
    | undefined;
  if (details?.type !== "filmstrip" || !Array.isArray(details.items)) return [];

  return details.items
    .filter(
      (item): item is { timing: number; data: string } =>
        !!item &&
        typeof item.data === "string" &&
        item.data.length > 0 &&
        Number.isFinite(item.timing),
    )
    .map((item) => ({ timing: item.timing, data: item.data }));
}

function networkRequests(audits: AuditResultsRecord | undefined): RawNetworkRequest[] {
  return auditItems(audits, "network-requests")
    .filter((item): item is TableItem => !!item && typeof item === "object")
    .map((item) => ({
      url: typeof item.url === "string" ? item.url : "",
      resourceType: typeof item.resourceType === "string" ? item.resourceType : undefined,
      networkRequestTime: getNumber(item.networkRequestTime),
      networkEndTime: getNumber(item.networkEndTime),
      transferSize: getNumber(item.transferSize),
      resourceSize: getNumber(item.resourceSize),
      statusCode: getNumber(item.statusCode),
      protocol: typeof item.protocol === "string" ? item.protocol : undefined,
      mimeType: typeof item.mimeType === "string" ? item.mimeType : undefined,
      isLinkPreload: item.isLinkPreload === true,
      entity: typeof item.entity === "string" ? item.entity : undefined,
      priority: typeof item.priority === "string" ? item.priority : undefined,
      renderBlocking: typeof item.renderBlocking === "string" ? item.renderBlocking : undefined,
    }))
    .filter((item) => item.url);
}

function isDocumentRequest(request: RawNetworkRequest): boolean {
  return request.resourceType === "Document" || !!request.mimeType?.includes("html");
}

function mainDocument(requests: RawNetworkRequest[]): RawNetworkRequest | undefined {
  return (
    requests.find((r) => isDocumentRequest(r) && !isNavigationRedirect(r.statusCode)) ??
    requests.find((r) => isDocumentRequest(r))
  );
}

function normalizeRenderBlocking(value: string | undefined): RenderBlockingStatus | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().replace(/_/g, "-");
  if (normalized === "blocking") return "blocking";
  if (normalized === "non-blocking" || normalized === "dynamically-injected-non-blocking") {
    return "non-blocking";
  }
  if (normalized === "potentially-blocking" || normalized === "in-body-parser-blocking") {
    return "potentially-blocking";
  }
  return undefined;
}

function downloadBlockingStatus(
  request: RawNetworkRequest,
  blockingUrlSet: Set<string>,
  textBlockingUrlSet: Set<string>,
): RenderBlockingStatus {
  const recorded = normalizeRenderBlocking(request.renderBlocking);
  if (recorded) return recorded;
  if (blockingUrlSet.has(request.url)) return "blocking";
  if (request.resourceType === "Stylesheet" && !request.isLinkPreload) {
    return "potentially-blocking";
  }
  if (request.resourceType === "Font" && textBlockingUrlSet.has(request.url)) {
    return "potentially-blocking";
  }
  return "non-blocking";
}

function coverageKeys(url: string): string[] {
  const keys = [url];
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    keys.push(parsed.toString());
    parsed.search = "";
    keys.push(parsed.toString());
  } catch {
    return keys;
  }
  return keys;
}

function rememberCoverage(map: Map<string, CodeCoverage>, url: string, coverage: CodeCoverage): void {
  for (const key of coverageKeys(url)) map.set(key, coverage);
}

function coverageFor(map: Map<string, CodeCoverage>, url: string): CodeCoverage | undefined {
  for (const key of coverageKeys(url)) {
    const coverage = map.get(key);
    if (coverage) return coverage;
  }
  return undefined;
}

function isCodeResource(resourceType: string | undefined): boolean {
  return resourceType === "Script" || resourceType === "Stylesheet";
}

function addOpportunityCoverage(map: Map<string, CodeCoverage>, items: unknown[]): void {
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as TableItem;
    const url = typeof row.url === "string" ? row.url : "";
    if (!url.startsWith("http")) continue;

    const wastedBytes = getNumber(row.wastedBytes);
    const wastedPercent = getNumber(row.wastedPercent);
    let totalBytes = getNumber(row.totalBytes);
    if (totalBytes == null && wastedBytes != null && wastedPercent != null && wastedPercent > 0) {
      totalBytes = wastedBytes / (wastedPercent / 100);
    }
    if (wastedBytes == null || totalBytes == null || totalBytes <= 0) continue;
    rememberCoverage(map, url, { totalBytes, wastedBytes });
  }
}

function codeCoverageByUrl(audits: AuditResultsRecord | undefined): Map<string, CodeCoverage> {
  const map = new Map<string, CodeCoverage>();

  const treemap = audits?.["script-treemap-data"]?.details as { nodes?: unknown[] } | undefined;
  for (const node of treemap?.nodes ?? []) {
    if (!node || typeof node !== "object") continue;
    const row = node as { name?: unknown; unusedBytes?: unknown; resourceBytes?: unknown };
    if (typeof row.name !== "string" || !row.name.startsWith("http")) continue;
    const totalBytes = getNumber(row.resourceBytes);
    const wastedBytes = getNumber(row.unusedBytes);
    if (totalBytes == null || wastedBytes == null || totalBytes <= 0) continue;
    rememberCoverage(map, row.name, { totalBytes, wastedBytes });
  }

  addOpportunityCoverage(map, auditItems(audits, "unused-javascript"));
  addOpportunityCoverage(map, auditItems(audits, "unused-css-rules"));
  return map;
}

function textBlockingUrls(audits: AuditResultsRecord | undefined): Set<string> {
  return new Set(
    auditItems(audits, "font-display-insight")
      .filter((item): item is TableItem => !!item && typeof item === "object")
      .map((item) => (typeof item.url === "string" ? item.url : ""))
      .filter(Boolean),
  );
}

function renderBlocking(audits: AuditResultsRecord | undefined): RenderBlockingItem[] {
  return auditItems(audits, "render-blocking-insight")
    .filter((item): item is TableItem => !!item && typeof item === "object")
    .map((item) => ({
      url: typeof item.url === "string" ? item.url : "",
      wastedMs: getNumber(item.wastedMs),
      totalBytes: getNumber(item.totalBytes),
    }))
    .filter((item) => item.url);
}

function collectChainUrls(chains: Record<string, unknown>, out: string[] = []): string[] {
  for (const node of Object.values(chains)) {
    if (!node || typeof node !== "object") continue;
    const n = node as { url?: string; children?: Record<string, unknown> };
    if (typeof n.url === "string") out.push(n.url);
    if (n.children) collectChainUrls(n.children, out);
  }
  return out;
}

function parseDependencyTree(audits: AuditResultsRecord | undefined): {
  chainUrls: string[];
  longestChainMs?: number;
  preconnectedText?: string;
  preconnectCandidates: PreconnectCandidate[];
} {
  const details = audits?.["network-dependency-tree-insight"]?.details as
    | { items?: unknown[] }
    | undefined;
  const result = {
    chainUrls: [] as string[],
    longestChainMs: undefined as number | undefined,
    preconnectedText: undefined as string | undefined,
    preconnectCandidates: [] as PreconnectCandidate[],
  };
  if (!details?.items) return result;

  for (const section of details.items) {
    if (!section || typeof section !== "object") continue;
    const s = section as {
      type?: string;
      title?: string;
      value?: unknown;
    };

    if (s.type === "list-section" && s.value && typeof s.value === "object") {
      const value = s.value as {
        type?: string;
        value?: string;
        longestChain?: { duration?: number };
        chains?: Record<string, unknown>;
        items?: TableItem[];
      };

      if (value.type === "network-tree") {
        result.longestChainMs = getNumber(value.longestChain?.duration);
        result.chainUrls = collectChainUrls(value.chains ?? {});
      } else if (value.type === "text" && typeof value.value === "string") {
        if (s.title?.toLowerCase().includes("preconnected")) {
          result.preconnectedText = value.value;
        }
      } else if (Array.isArray(value.items) && s.title?.toLowerCase().includes("preconnect")) {
        result.preconnectCandidates = value.items
          .map((item) => ({
            origin: typeof item.origin === "string" ? item.origin : "",
            wastedMs: getNumber(item.wastedMs) ?? 0,
          }))
          .filter((c) => c.origin);
      }
    }
  }

  return result;
}

function redirectHops(
  requests: RawNetworkRequest[],
  document: RawNetworkRequest | undefined,
  auditUrls: string[],
): RawNetworkRequest[] {
  const documentStart = document?.networkRequestTime;
  const listed = new Set(auditUrls.filter((url) => url && url !== document?.url));
  return requests
    .filter((request) => {
      if (request.networkRequestTime == null || request.networkEndTime == null) return false;
      if (document && request === document) return false;
      if (documentStart != null && request.networkRequestTime > documentStart) return false;
      if (isNavigationRedirect(request.statusCode)) return true;
      return listed.has(request.url);
    })
    .sort((a, b) => (a.networkRequestTime ?? 0) - (b.networkRequestTime ?? 0));
}

function taskRows(
  audits: AuditResultsRecord | undefined,
  id: string,
  includeUrl: boolean,
): RawLongTask[] {
  return auditItems(audits, id)
    .filter((item): item is TableItem => !!item && typeof item === "object")
    .map((item) => ({
      url: includeUrl && typeof item.url === "string" ? item.url : undefined,
      startTime: getNumber(item.startTime) ?? 0,
      duration: getNumber(item.duration) ?? 0,
    }))
    .filter((task) => task.duration > 0);
}

function mergeTasks(primary: RawLongTask[], extra: RawLongTask[]): RawLongTask[] {
  if (!primary.length) return extra;
  if (!extra.length) return primary;
  const seen = new Set(primary.map((task) => `${task.startTime}:${task.duration}`));
  return [...primary, ...extra.filter((task) => !seen.has(`${task.startTime}:${task.duration}`))];
}

function unmatchedObservedTasks(
  observed: RawLongTask[],
  attributed: RawLongTask[],
  cpu: number,
): RawLongTask[] {
  const pairs: { observedIndex: number; attributedIndex: number; delta: number }[] = [];
  observed.forEach((task, observedIndex) => {
    attributed.forEach((lantern, attributedIndex) => {
      const delta = Math.abs(task.duration * cpu - lantern.duration);
      const limit = Math.max(1, lantern.duration * 0.02);
      if (delta <= limit) pairs.push({ observedIndex, attributedIndex, delta });
    });
  });
  pairs.sort((a, b) => a.delta - b.delta || a.observedIndex - b.observedIndex);

  const usedObserved = new Set<number>();
  const usedAttributed = new Set<number>();
  for (const pair of pairs) {
    if (usedObserved.has(pair.observedIndex) || usedAttributed.has(pair.attributedIndex)) continue;
    usedObserved.add(pair.observedIndex);
    usedAttributed.add(pair.attributedIndex);
  }
  return observed.filter((_, index) => !usedObserved.has(index));
}

function longTasks(audits: AuditResultsRecord | undefined, clock: TimelineClock | null): RawLongTask[] {
  const attributed = taskRows(audits, "long-tasks", true);
  const observed = taskRows(audits, "main-thread-tasks", false);
  if (!clock) return mergeTasks(attributed, observed);

  const cpu = clock.throttling.cpuSlowdownMultiplier;
  const extras = clock.adjustTasks(unmatchedObservedTasks(observed, attributed, cpu));
  return mergeTasks(attributed, extras);
}

function lcpSubparts(audits: AuditResultsRecord | undefined): LcpSubpart[] {
  const details = audits?.["lcp-breakdown-insight"]?.details as { items?: unknown[] } | undefined;
  if (!details?.items) return [];

  for (const entry of details.items) {
    if (!entry || typeof entry !== "object") continue;
    const table = entry as { type?: string; items?: TableItem[] };
    if (table.type !== "table" || !Array.isArray(table.items)) continue;

    return table.items
      .map((item) => ({
        subpart: typeof item.subpart === "string" ? item.subpart : "",
        label: typeof item.label === "string" ? item.label : "",
        duration: getNumber(item.duration) ?? 0,
      }))
      .filter((s) => s.subpart);
  }

  return [];
}

function lcpElementLabel(audits: AuditResultsRecord | undefined): string | undefined {
  const details = audits?.["lcp-breakdown-insight"]?.details as { items?: unknown[] } | undefined;
  if (!details?.items) return undefined;

  for (const entry of details.items) {
    if (!entry || typeof entry !== "object") continue;
    const node = entry as { type?: string; nodeLabel?: string; snippet?: string };
    if (node.type === "node") {
      return node.nodeLabel ?? node.snippet;
    }
  }

  return undefined;
}

function lcpDiscoveryFailures(audits: AuditResultsRecord | undefined): LcpDiscoveryCheck[] {
  const details = audits?.["lcp-discovery-insight"]?.details as { items?: unknown[] } | undefined;
  if (!details?.items) return [];

  const failures: LcpDiscoveryCheck[] = [];
  for (const entry of details.items) {
    if (!entry || typeof entry !== "object") continue;
    const checklist = entry as {
      type?: string;
      items?: Record<string, { label?: string; value?: boolean }>;
    };
    if (checklist.type !== "checklist" || !checklist.items) continue;
    for (const [id, item] of Object.entries(checklist.items)) {
      if (!item || item.value !== false) continue;
      failures.push({
        id,
        label: typeof item.label === "string" ? item.label : id,
        value: false,
      });
    }
  }
  return failures;
}

const SKIPPED_USER_TIMING_NAMES = new Set(["clearMarks", "clearMeasures"]);

function userTimings(audits: AuditResultsRecord | undefined): UserTiming[] {
  return auditItems(audits, "user-timings")
    .filter((item): item is TableItem => !!item && typeof item === "object")
    .map((item) => ({
      name: typeof item.name === "string" ? item.name : "",
      timingType: typeof item.timingType === "string" ? item.timingType : "Mark",
      startTime: getNumber(item.startTime) ?? 0,
      duration: getNumber(item.duration),
    }))
    .filter((timing) => timing.name && !SKIPPED_USER_TIMING_NAMES.has(timing.name));
}

function buildLcpSegments(subparts: LcpSubpart[], lcpMs: number | undefined): LcpSegment[] {
  if (!subparts.length || lcpMs == null) return [];

  let cursor = 0;
  return subparts.map((s) => {
    const startMs = cursor;
    const endMs = cursor + s.duration;
    cursor = endMs;
    return {
      subpart: s.subpart,
      label: s.label,
      durationMs: s.duration,
      startMs,
      endMs,
    };
  });
}

function observedTraceTtfb(
  metrics: MetricsItem,
  document: RawNetworkRequest | undefined,
  serverThink: number | undefined,
): number | undefined {
  const explicit = getNumber(metrics.observedTimeToFirstByte);
  if (explicit != null) return explicit;

  if (document?.networkRequestTime != null && serverThink != null) {
    const timeMs = document.networkRequestTime + serverThink;
    if (document.networkEndTime == null || timeMs <= document.networkEndTime) {
      return timeMs;
    }
  }

  return undefined;
}

function traceTimeToFirstByte(
  metrics: MetricsItem,
  document: RawNetworkRequest | undefined,
  serverThink: number | undefined,
): { timeMs: number; observed: boolean } | undefined {
  const observed = observedTraceTtfb(metrics, document, serverThink);
  if (observed != null) return { timeMs: observed, observed: true };

  const simulated = getNumber(metrics.timeToFirstByte);
  if (simulated == null) return undefined;
  if (document?.networkEndTime != null && simulated > document.networkEndTime) {
    return undefined;
  }
  return { timeMs: simulated, observed: false };
}

function urlsMatch(left: string, right: string): boolean {
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
): CombinedRequest | null {
  if (request.networkRequestTime == null || request.networkEndTime == null) return null;
  return {
    url: request.url,
    resourceType: request.resourceType,
    networkRequestTime: request.networkRequestTime,
    networkEndTime: request.networkEndTime,
    transferSize: request.transferSize,
    resourceSize: request.resourceSize,
    statusCode: request.statusCode,
    protocol: request.protocol,
    mimeType: request.mimeType,
    isLinkPreload: request.isLinkPreload,
    entity: request.entity,
    priority: request.priority,
    renderBlocking: downloadBlockingStatus(request, blockingUrlSet, textBlockingUrlSet),
    isCriticalChain: chainUrlSet.has(request.url),
    coverage: isCodeResource(request.resourceType)
      ? coverageFor(coverageByUrl, request.url)
      : undefined,
  };
}

function enrichLongTask(
  task: RawLongTask,
  requests: RawNetworkRequest[],
  coverageByUrl: Map<string, CodeCoverage>,
): CombinedLongTask {
  const base: CombinedLongTask = {
    url: task.url,
    startTime: task.startTime,
    duration: task.duration,
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
  const elementLabel = lcpElementLabel(audits);
  const discoveryFailures = lcpDiscoveryFailures(audits);

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

  const hops = redirectHops(requests, document, redirectAuditUrls);
  const hopSet = new Set(hops);

  const toCombined = (request: RawNetworkRequest) =>
    toCombinedRequest(request, blockingUrlSet, textBlockingUrlSet, chainUrlSet, coverageByUrl);

  const combinedHops = hops
    .map(toCombined)
    .filter((request): request is CombinedRequest => request != null);
  const combinedRequests = requests
    .filter((request) => !hopSet.has(request))
    .map(toCombined)
    .filter((request): request is CombinedRequest => request != null);
  const combinedDocument = document ? toCombined(document) ?? undefined : undefined;

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
    longTasks: tasks.map((task) => enrichLongTask(task, requests, coverageByUrl)),
    userTimings: timings,
    screenshots,
    lcpElementLabel: elementLabel,
    lcpSegments: lcpSegs,
    lcpDiscoveryFailures: discoveryFailures,
    preconnectedText: depTree.preconnectedText,
    preconnectCandidates: depTree.preconnectCandidates,
  };
}
