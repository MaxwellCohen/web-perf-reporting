import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import type { AuditResultsRecord, TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import { buildTimelineMoments } from "./buildTimelineMoments";
import {
  createTimelineClock,
  isNavigationRedirect,
  resolveSimulatedThrottling,
  type TimelineClock,
} from "./simulatedThrottling";
import type {
  LcpSegment,
  MainThreadBlock,
  Milestone,
  NetworkBar,
  PageLoadTimeline,
  PhaseId,
  Rating,
  RenderBlockingStatus,
  ScreenshotFrame,
  TimelineNote,
  TimelinePhase,
  TimelineStep,
  TimelineTable,
  TimelineWaterfallBar,
} from "./types";

type MetricsItem = Record<string, unknown>;

type NetworkRequest = {
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
  /** Chrome/Lighthouse render-blocking status, when the trace recorded one. */
  renderBlocking?: string;
};

type LongTask = {
  url?: string;
  startTime: number;
  duration: number;
};

type LcpSubpart = {
  subpart: string;
  label: string;
  duration: number;
};

type PreconnectCandidate = {
  origin: string;
  wastedMs: number;
};

type RenderBlockingItem = {
  url: string;
  wastedMs?: number;
  totalBytes?: number;
};

type UserTiming = {
  name: string;
  timingType: string;
  startTime: number;
  duration?: number;
};

type LcpDiscoveryCheck = {
  id: string;
  label: string;
  value: boolean;
};

const PHASE_ORDER: PhaseId[] = [
  "navigation",
  "connection",
  "requestResponse",
  "parsingHead",
  "firstRender",
  "parsingComplete",
  "subresources",
  "afterLoad",
];

const PHASE_TITLES: Record<PhaseId, string> = {
  navigation: "Navigation start",
  connection: "Connection",
  requestResponse: "Request / response",
  parsingHead: "Parsing the head",
  firstRender: "First render",
  parsingComplete: "Parsing complete",
  subresources: "Subresources finish",
  afterLoad: "After load",
};

function ratingFor(value: number, good: number, poor: number): Rating {
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

function measured(
  id: string,
  title: string,
  detail: string,
  extras: Partial<TimelineStep> = {},
): TimelineStep {
  return {
    id,
    title,
    status: "measured",
    kind: "marker",
    detail,
    ...extras,
  };
}

/** Phase that is already underway at `timeMs` — latest start that is still at or before that time. */
function phaseActiveAt(phases: TimelinePhase[], timeMs: number): TimelinePhase | undefined {
  let active: TimelinePhase | undefined;
  for (const phase of phases) {
    if (phase.startMs <= timeMs) active = phase;
  }
  return active ?? phases[0];
}

function pushIntoPhase(phases: TimelinePhase[], timeMs: number, step: TimelineStep): void {
  const phase = phaseActiveAt(phases, timeMs);
  if (!phase) return;
  phase.steps.push(step);
}

function pushIntoNamedPhase(phases: TimelinePhase[], phaseId: PhaseId, step: TimelineStep): void {
  const phase = phases.find((p) => p.id === phaseId);
  if (!phase) return;
  phase.steps.push(step);
}

/** Same-type events whose starts are within this window collapse into one row. */
const START_GROUP_WINDOW_MS = 10;

/**
 * Cluster sorted items so each consecutive pair in a group starts within `windowMs`.
 * `key` must match for two items to share a group (e.g. resource type).
 */
function clusterByStartWindow<T>(
  items: T[],
  startMs: (item: T) => number,
  key: (item: T) => string,
  windowMs: number = START_GROUP_WINDOW_MS,
): T[][] {
  const groups: T[][] = [];
  for (const item of items) {
    const prev = groups[groups.length - 1];
    if (
      prev &&
      key(prev[0]!) === key(item) &&
      startMs(item) - startMs(prev[prev.length - 1]!) <= windowMs
    ) {
      prev.push(item);
    } else {
      groups.push([item]);
    }
  }
  return groups;
}

function pluralResourceTitle(resourceType: string, count: number): string {
  if (count === 1) return resourceType;
  if (resourceType === "Script") return `${count} Scripts`;
  if (resourceType === "Stylesheet") return `${count} Stylesheets`;
  if (resourceType === "Font") return `${count} Fonts`;
  if (resourceType === "Image") return `${count} Images`;
  if (resourceType === "Document") return `${count} Documents`;
  if (resourceType === "Fetch") return `${count} Fetches`;
  if (resourceType === "XHR") return `${count} XHRs`;
  return `${count} ${resourceType}s`;
}

function requestType(request: NetworkRequest): string {
  return request.resourceType ?? "Request";
}

function requestStart(request: NetworkRequest): number {
  return request.networkRequestTime ?? 0;
}

function differentTypeStartsBetween(
  requests: NetworkRequest[],
  group: NetworkRequest[],
  start: number,
  type: string,
): boolean {
  const previousStart = requestStart(group[group.length - 1]!);
  if (start <= previousStart) return false;
  return requests.some(
    (other) =>
      requestType(other) !== type &&
      requestStart(other) > previousStart &&
      requestStart(other) < start,
  );
}

/**
 * Same-type downloads share a row while no other resource type starts strictly
 * between them. That other request is the breaking resource and starts a new row.
 * Requests that start at the same instant are parallel, so they do not break the run.
 */
function groupDownloads(requests: NetworkRequest[]): NetworkRequest[][] {
  const sorted = [...requests].sort(
    (a, b) => requestStart(a) - requestStart(b) || a.url.localeCompare(b.url),
  );
  const groups: NetworkRequest[][] = [];
  const latestByType = new Map<string, NetworkRequest[]>();

  for (const request of sorted) {
    const type = requestType(request);
    const start = requestStart(request);
    const group = latestByType.get(type);

    if (group && !differentTypeStartsBetween(sorted, group, start, type)) {
      group.push(request);
    } else {
      const next = [request];
      groups.push(next);
      latestByType.set(type, next);
    }
  }

  return groups.sort((a, b) => requestStart(a[0]!) - requestStart(b[0]!));
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

/**
 * Blocking: the trace said so, or Lighthouse measured this URL delaying first paint.
 * Potentially blocking: a stylesheet that was not measured as delaying paint, or a
 * font Lighthouse flagged for blocking text. Other downloads are non-blocking.
 */
function downloadBlockingStatus(
  request: NetworkRequest,
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

/** One timeline row per download run. A different resource type between two of the same type starts a new row. */
function criticalChainFlag(longestChainMs: number | undefined): string {
  if (longestChainMs != null && longestChainMs > 0) {
    return `critical chain (${formatMs(longestChainMs)})`;
  }
  return "critical chain";
}

function placeNetworkEntries(
  phases: TimelinePhase[],
  requests: NetworkRequest[],
  document: NetworkRequest | undefined,
  blockingUrlSet: Set<string>,
  textBlockingUrlSet: Set<string>,
  chainUrlSet: Set<string>,
  longestChainMs: number | undefined,
  coverageByUrl: Map<string, CodeCoverage>,
  documentNotes: TimelineNote[],
): boolean {
  let attachedDocumentNotes = false;
  const timed = requests.filter(
    (r) => r.networkRequestTime != null && r.networkEndTime != null,
  );
  const groups = groupDownloads(timed);

  groups.forEach((group, index) => {
    const startMs = Math.min(...group.map((r) => r.networkRequestTime!));
    const endMs = Math.max(...group.map((r) => r.networkEndTime!));
    const resourceType = group[0]?.resourceType ?? "Request";
    const statuses = group.map((request) =>
      downloadBlockingStatus(request, blockingUrlSet, textBlockingUrlSet),
    );
    const anyBlocking = statuses.some((status) => status === "blocking");
    const anyDocument = group.some((r) => document != null && r.url === document.url);
    const anyPreload = group.some((r) => r.isLinkPreload);
    const anyCritical = group.some((r) => chainUrlSet.has(r.url));
    const totalBytes = group.reduce((sum, r) => sum + (r.transferSize ?? 0), 0);

    const flags = [
      anyDocument ? "document" : null,
      anyPreload ? "preload" : null,
      anyCritical ? criticalChainFlag(longestChainMs) : null,
    ].filter(Boolean);

    const singleCoverage =
      group.length === 1 ? coverageLabel(group[0]!, coverageByUrl) : undefined;
    const singlePriority = group.length === 1 ? group[0]!.priority : undefined;

    const detail =
      group.length === 1
        ? [
            shortUrl(group[0]!.url),
            group[0]!.statusCode != null ? `status ${group[0]!.statusCode}` : null,
            group[0]!.transferSize != null ? formatBytes(group[0]!.transferSize) : null,
            group[0]!.protocol ?? null,
            singlePriority ? `priority ${singlePriority}` : null,
            flags.length ? flags.join(" · ") : null,
            singleCoverage ?? null,
          ]
            .filter(Boolean)
            .join(" · ") + "."
        : [
            `${group.length} ${resourceType.toLowerCase()} requests`,
            totalBytes > 0 ? formatBytes(totalBytes) : null,
            flags.length ? flags.join(" · ") : null,
          ]
            .filter(Boolean)
            .join(" · ") + ".";

    const notes = anyDocument && documentNotes.length > 0 ? documentNotes : undefined;
    if (notes) attachedDocumentNotes = true;

    const showPriority = group.some((r) => r.priority);

    pushIntoPhase(
      phases,
      startMs,
      measured(`net-${index}`, pluralResourceTitle(resourceType, group.length), detail, {
        timeMs: startMs,
        endMs,
        kind: anyBlocking ? "blocking" : "marker",
        notes,
        waterfall: group.map((r, i) => ({
          id: `net-${index}-${i}`,
          label: shortUrl(r.url),
          href: r.url,
          startMs: r.networkRequestTime!,
          endMs: r.networkEndTime!,
          resourceType: r.resourceType,
          coverage: coverageLabel(r, coverageByUrl),
          priority: r.priority,
          renderBlocking: statuses[i],
        })),
        table: {
          headers: [
            { text: "URL" },
            { text: "Start", align: "end" },
            { text: "Duration", align: "end" },
            ...(showPriority ? [{ text: "Priority", align: "end" as const }] : []),
          ],
          rows: group.map((r) => [
            { text: shortUrl(r.url), href: r.url },
            { text: formatMs(r.networkRequestTime!), align: "end" as const },
            { text: formatMs(r.networkEndTime! - r.networkRequestTime!), align: "end" as const },
            ...(showPriority
              ? [{ text: r.priority ?? "", align: "end" as const }]
              : []),
          ]),
        },
      }),
    );
  });

  return attachedDocumentNotes;
}

function urlsMatch(left: string, right: string): boolean {
  const keys = new Set(coverageKeys(left));
  return coverageKeys(right).some((key) => keys.has(key));
}

function isScriptDownload(request: NetworkRequest): boolean {
  if (request.resourceType === "Script") return true;
  if (request.mimeType?.includes("javascript")) return true;
  return !request.resourceType && !request.mimeType;
}

/** Prefer the download that finished just before the task; otherwise the nearest one. */
function closestScriptDownload(
  requests: NetworkRequest[],
  taskStartMs: number,
): NetworkRequest | undefined {
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

type ScriptDownload = {
  size?: string;
  downloadDuration?: string;
  downloadStartMs?: number;
  downloadEndMs?: number;
  coverage?: string;
};

function scriptDownloadFor(
  url: string,
  taskStartMs: number,
  requests: NetworkRequest[],
  coverageByUrl: Map<string, CodeCoverage>,
): ScriptDownload {
  const request = closestScriptDownload(
    requests.filter((item) => urlsMatch(item.url, url) && isScriptDownload(item)),
    taskStartMs,
  );
  const coverage = coverageFor(coverageByUrl, url);
  const bytes = request?.transferSize ?? request?.resourceSize;
  const startMs = request?.networkRequestTime;
  const endMs = request?.networkEndTime;
  const hasWindow = startMs != null && endMs != null;

  return {
    size: bytes != null ? formatBytes(bytes) : undefined,
    downloadDuration: hasWindow ? formatMs(Math.max(0, endMs - startMs)) : undefined,
    downloadStartMs: hasWindow ? startMs : undefined,
    downloadEndMs: hasWindow ? endMs : undefined,
    coverage: coverage ? formatCoverage(coverage) : undefined,
  };
}

function longTaskBar(
  task: LongTask,
  id: string,
  requests: NetworkRequest[],
  coverageByUrl: Map<string, CodeCoverage>,
): TimelineWaterfallBar {
  const bar: TimelineWaterfallBar = {
    id,
    label: task.url ? shortUrl(task.url) : "Unattributed",
    href: task.url,
    startMs: task.startTime,
    endMs: task.startTime + task.duration,
    resourceType: "Script",
  };
  if (!task.url) return bar;

  const script = scriptDownloadFor(task.url, task.startTime, requests, coverageByUrl);
  if (script.size) bar.scriptSize = script.size;
  if (script.downloadDuration) bar.downloadDuration = script.downloadDuration;
  if (script.downloadStartMs != null) bar.downloadStartMs = script.downloadStartMs;
  if (script.downloadEndMs != null) bar.downloadEndMs = script.downloadEndMs;
  if (script.coverage) bar.coverage = script.coverage;
  return bar;
}

/** Long tasks grouped when starts are within 10 ms. */
function placeLongTaskEntries(
  phases: TimelinePhase[],
  tasks: LongTask[],
  requests: NetworkRequest[],
  coverageByUrl: Map<string, CodeCoverage>,
): void {
  if (!phases.length || !tasks.length) return;

  const ordered = [...tasks].sort((a, b) => a.startTime - b.startTime || b.duration - a.duration);
  const groups = clusterByStartWindow(
    ordered,
    (t) => t.startTime,
    () => "long-task",
  );

  groups.forEach((group, index) => {
    const startMs = Math.min(...group.map((t) => t.startTime));
    const endMs = Math.max(...group.map((t) => t.startTime + t.duration));
    const totalDuration = group.reduce((sum, t) => sum + t.duration, 0);

    const detail =
      group.length === 1
        ? group[0]!.url
          ? `${shortUrl(group[0]!.url)} blocked the main thread for ${formatMs(group[0]!.duration)}.`
          : `Unattributed script blocked the main thread for ${formatMs(group[0]!.duration)}.`
        : `${group.length} long tasks started within ${START_GROUP_WINDOW_MS} ms (${formatMs(totalDuration)} total).`;

    pushIntoPhase(
      phases,
      startMs,
      measured(
        `long-task-${index}`,
        group.length === 1 ? "Long task" : `${group.length} Long tasks`,
        detail,
        {
          timeMs: startMs,
          endMs,
          kind: "blocking",
          waterfall: group.map((task, i) =>
            longTaskBar(task, `long-task-${index}-${i}`, requests, coverageByUrl),
          ),
          table: {
            headers: [
              { text: "Script" },
              { text: "Start", align: "end" },
              { text: "Duration", align: "end" },
            ],
            rows: group.map((task) => [
              {
                text: task.url ? shortUrl(task.url) : "Unattributed",
                href: task.url,
              },
              { text: formatMs(task.startTime), align: "end" as const },
              { text: formatMs(task.duration), align: "end" as const },
            ]),
          },
        },
      ),
    );
  });
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

function networkRequests(audits: AuditResultsRecord | undefined): NetworkRequest[] {
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

function isDocumentRequest(request: NetworkRequest): boolean {
  return request.resourceType === "Document" || !!request.mimeType?.includes("html");
}

function mainDocument(requests: NetworkRequest[]): NetworkRequest | undefined {
  return (
    requests.find((r) => isDocumentRequest(r) && !isNavigationRedirect(r.statusCode)) ??
    requests.find((r) => isDocumentRequest(r))
  );
}

/**
 * Redirect hops that happen before the final document. Lighthouse's
 * `redirects.numericValue` is Lantern's time until the next document request,
 * already on the simulated clock, so it cannot be placed with `mapTime`.
 */
function redirectHops(
  requests: NetworkRequest[],
  document: NetworkRequest | undefined,
  auditUrls: string[],
): NetworkRequest[] {
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

/** Hop rows nested on the Redirects card, so each 3xx is not its own timeline moment. */
function redirectWaterfall(hops: NetworkRequest[]): {
  waterfall: TimelineWaterfallBar[];
  table: TimelineTable;
} {
  return {
    waterfall: hops.map((hop, index) => ({
      id: `nav-redirects-${index}`,
      label: shortUrl(hop.url),
      href: hop.url,
      startMs: hop.networkRequestTime!,
      endMs: hop.networkEndTime!,
      resourceType: "Redirect",
    })),
    table: {
      headers: [
        { text: "URL" },
        { text: "Start", align: "end" },
        { text: "Duration", align: "end" },
        { text: "Status", align: "end" },
        { text: "Size", align: "end" },
        { text: "Protocol", align: "end" },
      ],
      rows: hops.map((hop) => [
        { text: shortUrl(hop.url), href: hop.url },
        { text: formatMs(hop.networkRequestTime!), align: "end" as const },
        {
          text: formatMs(hop.networkEndTime! - hop.networkRequestTime!),
          align: "end" as const,
        },
        {
          text: hop.statusCode != null ? `status ${hop.statusCode}` : "",
          align: "end" as const,
        },
        {
          text: hop.transferSize != null ? formatBytes(hop.transferSize) : "",
          align: "end" as const,
        },
        { text: hop.protocol ?? "", align: "end" as const },
      ]),
    },
  };
}

function taskRows(
  audits: AuditResultsRecord | undefined,
  id: string,
  includeUrl: boolean,
): LongTask[] {
  return auditItems(audits, id)
    .filter((item): item is TableItem => !!item && typeof item === "object")
    .map((item) => ({
      url: includeUrl && typeof item.url === "string" ? item.url : undefined,
      startTime: getNumber(item.startTime) ?? 0,
      duration: getNumber(item.duration) ?? 0,
    }))
    .filter((task) => task.duration >= 50);
}

function mergeTasks(primary: LongTask[], extra: LongTask[]): LongTask[] {
  if (!primary.length) return extra;
  if (!extra.length) return primary;
  const seen = new Set(primary.map((task) => `${task.startTime}:${task.duration}`));
  return [...primary, ...extra.filter((task) => !seen.has(`${task.startTime}:${task.duration}`))];
}

/**
 * An observed task is the same work as a Lantern long task when
 * `duration × CPU` matches that task's simulated duration.
 */
function unmatchedObservedTasks(
  observed: LongTask[],
  attributed: LongTask[],
  cpu: number,
): LongTask[] {
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

/**
 * Simulated runs store `long-tasks` on the Lantern clock already.
 * `main-thread-tasks` stay on the observed trace and are moved onto that clock here.
 */
function longTasks(audits: AuditResultsRecord | undefined, clock: TimelineClock | null): LongTask[] {
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

/** Failed checklist rows from lcp-discovery-insight (e.g. missing fetchpriority=high). */
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

function placeUserTimingEntries(phases: TimelinePhase[], timings: UserTiming[]): void {
  if (!phases.length || !timings.length) return;

  timings.forEach((timing, index) => {
    const isMeasure = timing.timingType.toLowerCase() === "measure" && timing.duration != null;
    const endMs = isMeasure ? timing.startTime + timing.duration! : undefined;
    const detail = isMeasure
      ? `User timing measure lasting ${formatMs(timing.duration!)}.`
      : "User timing mark.";

    pushIntoPhase(
      phases,
      timing.startTime,
      measured(`user-timing-${index}`, timing.name, detail, {
        timeMs: timing.startTime,
        endMs,
        kind: "marker",
      }),
    );
  });
}

function placePreconnectFact(
  phases: TimelinePhase[],
  preconnectedText: string | undefined,
  candidates: PreconnectCandidate[],
): void {
  if (!candidates.length) return;

  const maxSavings = Math.max(...candidates.map((c) => c.wastedMs));
  const lines = [
    preconnectedText ? `${preconnectedText.replace(/\.$/, "")}.` : null,
    `${candidates.length} origin${candidates.length === 1 ? "" : "s"} could save an estimated ${formatMs(
      maxSavings,
    )} on LCP with preconnect.`,
  ].filter(Boolean);

  pushIntoNamedPhase(
    phases,
    "connection",
    measured("conn-preconnect", "Preconnect", lines.join(" "), {
      kind: "fact",
      evidence: candidates.map((c) => `${c.origin} (~${formatMs(c.wastedMs)} est. LCP savings)`),
      table: {
        headers: [
          { text: "Origin" },
          { text: "Est. LCP savings", align: "end" },
        ],
        rows: candidates.map((c) => [
          { text: c.origin },
          { text: formatMs(c.wastedMs), align: "end" as const },
        ]),
      },
    }),
  );
}

type CodeCoverage = {
  totalBytes: number;
  wastedBytes: number;
};

function isCodeResource(resourceType: string | undefined): boolean {
  return resourceType === "Script" || resourceType === "Stylesheet";
}

/** Keys that still match when a hash or query string differs between audits. */
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

function formatCoverage(coverage: CodeCoverage): string {
  const wastedBytes = Math.max(0, coverage.wastedBytes);
  const totalBytes = Math.max(coverage.totalBytes, wastedBytes);
  const usedBytes = totalBytes - wastedBytes;
  const usedPercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
  if (wastedBytes <= 0) return `${usedPercent}% used · ${formatBytes(totalBytes)}`;
  return `${usedPercent}% used · ${formatBytes(usedBytes)} used of ${formatBytes(totalBytes)} · ${formatBytes(wastedBytes)} unused`;
}

function coverageLabel(
  request: NetworkRequest,
  coverageByUrl: Map<string, CodeCoverage>,
): string | undefined {
  if (!isCodeResource(request.resourceType)) return undefined;
  const coverage = coverageFor(coverageByUrl, request.url);
  return coverage ? formatCoverage(coverage) : undefined;
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

/**
 * Byte coverage for stylesheets and scripts.
 * Treemap fills in scripts the unused-JavaScript audit omits; that audit wins
 * when both describe the same URL.
 */
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
      description?: string;
    };

    if (s.type === "list-section" && s.value && typeof s.value === "object") {
      const value = s.value as {
        type?: string;
        value?: string;
        longestChain?: { duration?: number };
        chains?: Record<string, unknown>;
        items?: TableItem[];
        headings?: unknown[];
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

function collectChainUrls(chains: Record<string, unknown>, out: string[] = []): string[] {
  for (const node of Object.values(chains)) {
    if (!node || typeof node !== "object") continue;
    const n = node as { url?: string; children?: Record<string, unknown> };
    if (typeof n.url === "string") out.push(n.url);
    if (n.children) collectChainUrls(n.children, out);
  }
  return out;
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 40 ? `${u.pathname.slice(0, 37)}…` : u.pathname;
    return `${u.host}${path}`;
  } catch {
    return url.length > 60 ? `${url.slice(0, 57)}…` : url;
  }
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms >= 10000 ? 1 : 2)} s`;
  return `${Math.round(ms)} ms`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} B`;
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

/**
 * Observed first byte on the trace clock: `observedTimeToFirstByte` when
 * present, otherwise the document request start plus main-document server
 * response time. Reports without simulated throttling stay on this clock.
 */
function observedTraceTtfb(
  metrics: MetricsItem,
  document: NetworkRequest | undefined,
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
  document: NetworkRequest | undefined,
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

function ttfbStepDetail(
  timeMs: number,
  observed: boolean,
  simulated: number | undefined,
  simulationLabel?: string,
): string {
  if (simulationLabel) {
    return `First byte at ${formatMs(timeMs)} under simulated ${simulationLabel}.`;
  }
  if (!observed) return `First byte at ${formatMs(timeMs)}.`;
  const base = `Observed first byte at ${formatMs(timeMs)}.`;
  if (simulated != null && simulated > timeMs * 1.5) {
    return `${base} The lab score (${formatMs(simulated)}) includes simulated throttling and is not on this trace.`;
  }
  return base;
}

export function buildPageLoadTimeline(source: InsightsContextItem): PageLoadTimeline | null {
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
  const docStart = document?.networkRequestTime ?? 0;
  const docEnd = document?.networkEndTime;
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

  const parseStart = ttfb ?? docStart;
  const headEnd = Math.max(
    parseStart + 1,
    ...requests
      .filter((r) => r.resourceType === "Stylesheet" || r.resourceType === "Font")
      .map((r) => r.networkEndTime ?? 0),
    fcp ?? 0,
  );
  const loadTime = load ?? lcp ?? 0;
  const hasPreconnectFact = depTree.preconnectCandidates.length > 0;

  // Phase shells — network/long tasks land by time; milestones go to named phases.
  // Connection is included when preconnect candidates or preconnected origins are present.
  const phases: TimelinePhase[] = [
    {
      id: "navigation",
      title: PHASE_TITLES.navigation,
      startMs: 0,
      endMs: Math.max(docStart, 1),
      steps: [],
    },
    ...(hasPreconnectFact
      ? [
          {
            id: "connection" as const,
            title: PHASE_TITLES.connection,
            startMs: docStart,
            endMs: Math.max(ttfb ?? docStart, docStart + 1),
            steps: [],
          },
        ]
      : []),
    {
      id: "requestResponse",
      title: PHASE_TITLES.requestResponse,
      startMs: docStart,
      endMs: Math.max(docEnd ?? ttfb ?? docStart, docStart + 1),
      steps: [],
    },
    {
      id: "parsingHead",
      title: PHASE_TITLES.parsingHead,
      startMs: parseStart,
      endMs: headEnd,
      steps: [],
    },
    {
      id: "firstRender",
      title: PHASE_TITLES.firstRender,
      startMs: docEnd ?? ttfb ?? 0,
      endMs: Math.max(fcp ?? 0, firstPaint ?? 0, (docEnd ?? 0) + 1),
      steps: [],
    },
    {
      id: "parsingComplete",
      title: PHASE_TITLES.parsingComplete,
      startMs: dcl ?? fcp ?? 0,
      endMs: Math.max(dcl ?? 0, load ?? 0, fcp ?? 0) + 1,
      steps: [],
    },
    {
      id: "subresources",
      title: PHASE_TITLES.subresources,
      startMs: fcp ?? dcl ?? 0,
      endMs: Math.max(lcp ?? 0, load ?? 0, lastVisual ?? 0, (fcp ?? 0) + 1),
      steps: [],
    },
    {
      id: "afterLoad",
      title: PHASE_TITLES.afterLoad,
      startMs: loadTime,
      endMs: Math.max(traceEnd ?? 0, interactive ?? 0, loadTime + 1),
      steps: [],
    },
  ];

  // --- Timed milestones ---
  pushIntoNamedPhase(
    phases,
    "navigation",
    measured(
      "nav-start",
      "navigationStart",
      "Lab navigation begins. performance.timeOrigin is set.",
      {
        timeMs: 0,
        kind: "marker",
      },
    ),
  );

  const hops = redirectHops(requests, document, redirectAuditUrls);
  const redirectStart = hops.length
    ? Math.min(...hops.map((hop) => hop.networkRequestTime!))
    : redirectAuditMs != null && redirectAuditMs > 0
      ? 0
      : undefined;
  const redirectEnd = hops.length
    ? Math.max(...hops.map((hop) => hop.networkEndTime!))
    : redirectAuditMs != null && redirectAuditMs > 0
      ? redirectAuditMs
      : undefined;
  if (redirectStart != null && redirectEnd != null && redirectEnd > redirectStart) {
    const redirectMs = redirectEnd - redirectStart;
    pushIntoNamedPhase(
      phases,
      "navigation",
      measured(
        "nav-redirects",
        "Redirects",
        `${formatMs(redirectMs)} spent on redirects before the document.`,
        {
          timeMs: redirectStart,
          endMs: redirectEnd,
          kind: "blocking",
          rating: redirectMs > 100 ? "needs-improvement" : "good",
          evidence: hops.length ? hops.map((hop) => hop.url) : redirectAuditUrls,
          ...(hops.length ? redirectWaterfall(hops) : {}),
        },
      ),
    );
  }

  const documentNotes: TimelineNote[] = [];
  if (serverThink != null && document?.networkRequestTime != null) {
    const serverStart =
      clock && ttfb != null ? Math.max(0, ttfb - serverThink) : document.networkRequestTime;
    const serverEnd = clock && ttfb != null ? ttfb : document.networkRequestTime + serverThink;
    documentNotes.push({
      id: "req-server",
      title: "Server think time",
      detail: `Root document server response took ${formatMs(serverThink)}.`,
      status: "measured",
      kind: "marker",
      timeMs: serverStart,
      endMs: serverEnd,
    });
  }

  if (ttfb != null) {
    documentNotes.push({
      id: "req-ttfb",
      title: "TTFB",
      detail: ttfbStepDetail(ttfb, ttfbObserved, simulatedTtfb, clock?.throttling.label),
      status: "measured",
      kind: "marker",
      timeMs: ttfb,
      rating: ratingFor(ttfb, 800, 1800),
    });
  }

  if (fcp != null) {
    const paintNotes = [
      firstPaint != null && Math.abs(firstPaint - fcp) > 100
        ? `First Paint was ${formatMs(firstPaint)}.`
        : null,
      firstVisual != null && Math.abs(firstVisual - fcp) > 100
        ? `First visual change was ${formatMs(firstVisual)}.`
        : null,
    ].filter(Boolean);
    pushIntoNamedPhase(
      phases,
      "firstRender",
      measured(
        "render-fcp",
        "FCP",
        [`First Contentful Paint at ${formatMs(fcp)}.`, ...paintNotes].join(" "),
        {
          timeMs: fcp,
          kind: "cwv",
          rating: ratingFor(fcp, 1800, 3000),
        },
      ),
    );
  }

  // LCP subparts that fall after FCP become their own rows so the FCP→LCP gap
  // shows the work Lantern attributes there. Element render delay is the span
  // those events occupy, so it stays on the LCP breakdown instead of a row.
  if (lcp != null && lcpSegs.length) {
    for (const seg of lcpSegs) {
      if (seg.subpart === "elementRenderDelay") continue;
      if (seg.durationMs < 100) continue;
      if (fcp != null && seg.endMs <= fcp) continue;
      const startMs = fcp != null ? Math.max(fcp, seg.startMs) : seg.startMs;
      if (startMs >= lcp) continue;
      pushIntoNamedPhase(
        phases,
        "firstRender",
        measured(
          `lcp-seg-${seg.subpart}`,
          seg.label,
          `${formatMs(seg.durationMs)} of LCP is ${seg.label.toLowerCase()}.`,
          {
            timeMs: startMs,
            endMs: Math.min(lcp, seg.endMs),
            kind: "marker",
          },
        ),
      );
    }
  }

  if (dcl != null) {
    pushIntoNamedPhase(
      phases,
      "parsingComplete",
      measured("parse-dcl", "DOMContentLoaded", `DOMContentLoaded at ${formatMs(dcl)}.`, {
        timeMs: dcl,
        kind: "marker",
      }),
    );
  }

  if (lcp != null) {
    const largest = [...subparts].sort((a, b) => b.duration - a.duration)[0];
    const discoveryNotes: TimelineNote[] = discoveryFailures.map((failure) => ({
      id: `lcp-discovery-${failure.id}`,
      title: "LCP discovery",
      detail: failure.label,
      status: "measured" as const,
      kind: "blocking" as const,
    }));
    pushIntoNamedPhase(
      phases,
      "subresources",
      measured(
        "sub-lcp",
        "LCP",
        [
          `Largest Contentful Paint at ${formatMs(lcp)}.`,
          elementLabel ? `Element: ${elementLabel}.` : null,
          largest ? `Largest subpart: ${largest.label} (${formatMs(largest.duration)}).` : null,
        ]
          .filter(Boolean)
          .join(" "),
        {
          timeMs: lcp,
          kind: "cwv",
          rating: ratingFor(lcp, 2500, 4000),
          notes: discoveryNotes.length ? discoveryNotes : undefined,
        },
      ),
    );
  }

  if (load != null) {
    pushIntoNamedPhase(
      phases,
      "subresources",
      measured("sub-load", "window load", `Load event at ${formatMs(load)}.`, {
        timeMs: load,
        kind: "marker",
      }),
    );
  }

  if (lastVisual != null) {
    pushIntoNamedPhase(
      phases,
      "subresources",
      measured(
        "sub-last-visual",
        "Last visual change",
        `Last visual change at ${formatMs(lastVisual)}.`,
        { timeMs: lastVisual, kind: "marker" },
      ),
    );
  }

  if (interactive != null) {
    pushIntoNamedPhase(
      phases,
      "afterLoad",
      measured("after-tti", "TTI (lab)", `Time to Interactive ${formatMs(interactive)}.`, {
        timeMs: interactive,
        kind: "marker",
      }),
    );
  }

  if (traceEnd != null) {
    pushIntoNamedPhase(
      phases,
      "afterLoad",
      measured("after-trace-end", "Trace end", `Performance trace ends at ${formatMs(traceEnd)}.`, {
        timeMs: traceEnd,
      }),
    );
  }

  placePreconnectFact(phases, depTree.preconnectedText, depTree.preconnectCandidates);
  placeUserTimingEntries(phases, timings);

  const hopSet = new Set(hops);
  const coverageByUrl = codeCoverageByUrl(audits);
  const attachedDocumentNotes = placeNetworkEntries(
    phases,
    requests.filter((request) => !hopSet.has(request)),
    document,
    blockingUrlSet,
    textBlockingUrlSet,
    chainUrlSet,
    depTree.longestChainMs,
    coverageByUrl,
    documentNotes,
  );
  if (!attachedDocumentNotes) {
    for (const note of documentNotes) {
      pushIntoNamedPhase(
        phases,
        "requestResponse",
        measured(note.id, note.title, note.detail, {
          timeMs: note.timeMs,
          endMs: note.endMs,
          kind: note.kind,
          rating: note.rating,
        }),
      );
    }
  }
  placeLongTaskEntries(phases, tasks, requests, coverageByUrl);

  const orderedPhases = PHASE_ORDER.map((id) => phases.find((p) => p.id === id)!)
    .filter(Boolean)
    .filter((phase) => phase.steps.length > 0);

  // --- Lanes (for axis / export; moments are the UI rows) ---
  const milestones: Milestone[] = [];
  const addMilestone = (
    id: string,
    label: string,
    timeMs: number | undefined,
    kind: Milestone["kind"],
    phaseId: PhaseId,
    rating?: Rating,
  ) => {
    if (timeMs == null) return;
    milestones.push({ id, label, timeMs, kind, phaseId, rating });
  };

  addMilestone(
    "m-ttfb",
    "TTFB",
    ttfb,
    "marker",
    "requestResponse",
    ttfb != null ? ratingFor(ttfb, 800, 1800) : undefined,
  );
  addMilestone(
    "m-fcp",
    "FCP",
    fcp,
    "cwv",
    "firstRender",
    fcp != null ? ratingFor(fcp, 1800, 3000) : undefined,
  );
  addMilestone("m-dcl", "DCL", dcl, "marker", "parsingComplete");
  addMilestone(
    "m-lcp",
    "LCP",
    lcp,
    "cwv",
    "subresources",
    lcp != null ? ratingFor(lcp, 2500, 4000) : undefined,
  );
  addMilestone("m-load", "Load", load, "marker", "subresources");
  addMilestone("m-last", "Last visual", lastVisual, "marker", "subresources");

  const networkBars: NetworkBar[] = requests
    .filter((r) => r.networkRequestTime != null && r.networkEndTime != null)
    .map((r, i) => ({
      id: `net-${i}`,
      url: r.url,
      resourceType: r.resourceType ?? "Other",
      startMs: r.networkRequestTime!,
      endMs: r.networkEndTime!,
      transferSize: r.transferSize,
      statusCode: r.statusCode,
      protocol: r.protocol,
      priority: r.priority,
      isLinkPreload: r.isLinkPreload,
      isRenderBlocking:
        downloadBlockingStatus(r, blockingUrlSet, textBlockingUrlSet) === "blocking",
      isCriticalChain: chainUrlSet.has(r.url),
      entity: r.entity,
    }));

  const mainThreadBlocks: MainThreadBlock[] = tasks.map((t, i) => ({
    id: `task-${i}`,
    startMs: t.startTime,
    durationMs: t.duration,
    url: t.url,
  }));

  const axisEndMs = Math.max(
    lcp ?? 0,
    load ?? 0,
    lastVisual ?? 0,
    fcp ?? 0,
    interactive ?? 0,
    traceEnd ?? 0,
    ...networkBars.map((b) => b.endMs),
    ...mainThreadBlocks.map((b) => b.startMs + b.durationMs),
    ...screenshots.map((shot) => shot.timing),
    ...timings.map((t) => t.startTime + (t.duration ?? 0)),
    1,
  );

  const moments = buildTimelineMoments(orderedPhases, screenshots, lcpSegs, elementLabel);

  return {
    label: source.label,
    phases: orderedPhases,
    moments,
    screenshots,
    milestones,
    networkBars,
    mainThreadBlocks,
    lcpSegments: lcpSegs,
    lcpElementLabel: elementLabel,
    findings: [],
    axisEndMs,
    simulationLabel: clock?.throttling.label,
  };
}

export function buildPageLoadTimelines(items: InsightsContextItem[]): PageLoadTimeline[] {
  return items
    .map((item) => buildPageLoadTimeline(item))
    .filter((t): t is PageLoadTimeline => t != null);
}
