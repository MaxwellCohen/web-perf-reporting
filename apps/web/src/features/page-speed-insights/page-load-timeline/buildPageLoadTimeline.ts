import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import type { AuditResultsRecord, TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import { buildTimelineMoments } from "./buildTimelineMoments";
import {
  createTimelineClock,
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
  ScreenshotFrame,
  TimelinePhase,
  TimelineStep,
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

function pushIntoPhase(
  phases: TimelinePhase[],
  timeMs: number,
  step: TimelineStep,
): void {
  const phase = phaseActiveAt(phases, timeMs);
  if (!phase) return;
  phase.steps.push(step);
}

function pushIntoNamedPhase(
  phases: TimelinePhase[],
  phaseId: PhaseId,
  step: TimelineStep,
): void {
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

/** One timeline row per timed network request, grouped by type when starts are within 10 ms. */
function placeNetworkEntries(
  phases: TimelinePhase[],
  requests: NetworkRequest[],
  document: NetworkRequest | undefined,
  blockingUrlSet: Set<string>,
  chainUrlSet: Set<string>,
): void {
  const timed = requests
    .filter((r) => r.networkRequestTime != null && r.networkEndTime != null)
    .sort((a, b) => (a.networkRequestTime ?? 0) - (b.networkRequestTime ?? 0));

  // Cluster within each resource type so a stylesheet between two scripts
  // does not split a script burst that still starts within 10 ms.
  const byType = new Map<string, NetworkRequest[]>();
  for (const request of timed) {
    const type = request.resourceType ?? "Request";
    const list = byType.get(type) ?? [];
    list.push(request);
    byType.set(type, list);
  }

  const groups = [...byType.values()]
    .flatMap((list) =>
      clusterByStartWindow(
        list,
        (r) => r.networkRequestTime!,
        () => "same",
      ),
    )
    .sort((a, b) => (a[0]!.networkRequestTime ?? 0) - (b[0]!.networkRequestTime ?? 0));

  groups.forEach((group, index) => {
    const startMs = Math.min(...group.map((r) => r.networkRequestTime!));
    const endMs = Math.max(...group.map((r) => r.networkEndTime!));
    const resourceType = group[0]?.resourceType ?? "Request";
    const anyBlocking = group.some(
      (r) => blockingUrlSet.has(r.url) || r.resourceType === "Stylesheet",
    );
    const anyDocument = group.some((r) => document != null && r.url === document.url);
    const anyPreload = group.some((r) => r.isLinkPreload);
    const anyCritical = group.some((r) => chainUrlSet.has(r.url));
    const totalBytes = group.reduce((sum, r) => sum + (r.transferSize ?? 0), 0);

    const flags = [
      anyDocument ? "document" : null,
      anyBlocking ? "render-blocking" : null,
      anyPreload ? "preload" : null,
      anyCritical ? "critical chain" : null,
    ].filter(Boolean);

    const detail =
      group.length === 1
        ? [
            shortUrl(group[0]!.url),
            group[0]!.statusCode != null ? `status ${group[0]!.statusCode}` : null,
            group[0]!.transferSize != null ? formatBytes(group[0]!.transferSize) : null,
            group[0]!.protocol ?? null,
            flags.length ? flags.join(" · ") : null,
          ]
            .filter(Boolean)
            .join(" · ") + "."
        : [
            `${group.length} ${resourceType.toLowerCase()} requests started within ${START_GROUP_WINDOW_MS} ms`,
            totalBytes > 0 ? formatBytes(totalBytes) : null,
            flags.length ? flags.join(" · ") : null,
          ]
            .filter(Boolean)
            .join(" · ") + ".";

    pushIntoPhase(
      phases,
      startMs,
      measured(`net-${index}`, pluralResourceTitle(resourceType, group.length), detail, {
        timeMs: startMs,
        endMs,
        kind: anyBlocking ? "blocking" : "marker",
        waterfall: group.map((r, i) => ({
          id: `net-${index}-${i}`,
          label: shortUrl(r.url),
          href: r.url,
          startMs: r.networkRequestTime!,
          endMs: r.networkEndTime!,
          resourceType: r.resourceType,
        })),
        table: {
          headers: [{ text: "URL" }, { text: "Start", align: "end" }, { text: "Duration", align: "end" }],
          rows: group.map((r) => [
            { text: shortUrl(r.url), href: r.url },
            { text: formatMs(r.networkRequestTime!), align: "end" as const },
            { text: formatMs(r.networkEndTime! - r.networkRequestTime!), align: "end" as const },
          ]),
        },
      }),
    );
  });
}

/** Long tasks grouped when starts are within 10 ms. */
function placeLongTaskEntries(phases: TimelinePhase[], tasks: LongTask[]): void {
  if (!phases.length || !tasks.length) return;

  const ordered = [...tasks].sort(
    (a, b) => a.startTime - b.startTime || b.duration - a.duration,
  );
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
          waterfall: group.map((task, i) => ({
            id: `long-task-${index}-${i}`,
            label: task.url ? shortUrl(task.url) : "Unattributed",
            href: task.url,
            startMs: task.startTime,
            endMs: task.startTime + task.duration,
            resourceType: "Script",
          })),
          table: {
            headers: [{ text: "Script" }, { text: "Start", align: "end" }, { text: "Duration", align: "end" }],
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
    }))
    .filter((item) => item.url);
}

function mainDocument(requests: NetworkRequest[]): NetworkRequest | undefined {
  return (
    requests.find((r) => r.resourceType === "Document") ??
    requests.find((r) => r.mimeType?.includes("html"))
  );
}

function longTasks(audits: AuditResultsRecord | undefined): LongTask[] {
  const fromLong = auditItems(audits, "long-tasks")
    .filter((item): item is TableItem => !!item && typeof item === "object")
    .map((item) => ({
      url: typeof item.url === "string" ? item.url : undefined,
      startTime: getNumber(item.startTime) ?? 0,
      duration: getNumber(item.duration) ?? 0,
    }))
    .filter((t) => t.duration >= 50);

  const fromMain = auditItems(audits, "main-thread-tasks")
    .filter((item): item is TableItem => !!item && typeof item === "object")
    .map((item) => ({
      startTime: getNumber(item.startTime) ?? 0,
      duration: getNumber(item.duration) ?? 0,
    }))
    .filter((t) => t.duration >= 50);

  if (!fromLong.length) return fromMain;
  if (!fromMain.length) return fromLong;

  // Prefer attributed long-tasks rows; keep main-thread tasks that are not duplicates.
  const seen = new Set(fromLong.map((t) => `${t.startTime}:${t.duration}`));
  return [
    ...fromLong,
    ...fromMain.filter((t) => !seen.has(`${t.startTime}:${t.duration}`)),
  ];
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
  const tasks = clock ? clock.adjustTasks(longTasks(audits)) : longTasks(audits);
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

  const depTree = parseDependencyTree(audits);
  const redirectMs = mapMs(getNumber(audits.redirects?.numericValue));
  const redirectItems = auditItems(audits, "redirects");
  const chainUrlSet = new Set(depTree.chainUrls);
  const blockingUrlSet = new Set(blocking.map((b) => b.url));

  const parseStart = ttfb ?? docStart;
  const headEnd = Math.max(
    parseStart + 1,
    ...requests
      .filter((r) => r.resourceType === "Stylesheet" || r.resourceType === "Font")
      .map((r) => r.networkEndTime ?? 0),
    fcp ?? 0,
  );
  const loadTime = load ?? lcp ?? 0;

  // Phase shells — network/long tasks land by time; milestones go to named phases.
  // Connection has no timed spans in this lab report, so it is omitted.
  const phases: TimelinePhase[] = [
    {
      id: "navigation",
      title: PHASE_TITLES.navigation,
      startMs: 0,
      endMs: Math.max(docStart, 1),
      steps: [],
    },
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
    measured("nav-start", "navigationStart", "Lab navigation begins. performance.timeOrigin is set.", {
      timeMs: 0,
      kind: "marker",
    }),
  );

  if (redirectMs != null && redirectMs > 0) {
    pushIntoNamedPhase(
      phases,
      "navigation",
      measured(
        "nav-redirects",
        "Redirects",
        `${formatMs(redirectMs)} spent on redirects before the document.`,
        {
          timeMs: 0,
          endMs: redirectMs,
          kind: "blocking",
          rating: redirectMs > 100 ? "needs-improvement" : "good",
          evidence: redirectItems
            .map((item) =>
              item && typeof item === "object" && "url" in item
                ? String((item as TableItem).url)
                : "",
            )
            .filter(Boolean),
        },
      ),
    );
  }

  if (serverThink != null && document?.networkRequestTime != null) {
    const serverStart =
      clock && ttfb != null
        ? Math.max(0, ttfb - serverThink)
        : document.networkRequestTime;
    const serverEnd = clock && ttfb != null ? ttfb : document.networkRequestTime + serverThink;
    pushIntoNamedPhase(
      phases,
      "requestResponse",
      measured(
        "req-server",
        "Server think time",
        `Root document server response took ${formatMs(serverThink)}.`,
        {
          timeMs: serverStart,
          endMs: serverEnd,
          kind: "marker",
        },
      ),
    );
  }

  if (ttfb != null) {
    pushIntoNamedPhase(
      phases,
      "requestResponse",
      measured(
        "req-ttfb",
        "TTFB",
        ttfbStepDetail(ttfb, ttfbObserved, simulatedTtfb, clock?.throttling.label),
        {
          timeMs: ttfb,
          kind: "marker",
          rating: ratingFor(ttfb, 800, 1800),
        },
      ),
    );
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
  // shows the work Lantern attributes there (especially element render delay).
  if (lcp != null && lcpSegs.length) {
    for (const seg of lcpSegs) {
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
            kind: seg.subpart === "elementRenderDelay" ? "blocking" : "marker",
          },
        ),
      );
    }
  }

  if (dcl != null) {
    pushIntoNamedPhase(
      phases,
      "parsingComplete",
      measured(
        "parse-dcl",
        "DOMContentLoaded",
        `DOMContentLoaded at ${formatMs(dcl)}.`,
        { timeMs: dcl, kind: "marker" },
      ),
    );
  }

  if (lcp != null) {
    const largest = [...subparts].sort((a, b) => b.duration - a.duration)[0];
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

  placeNetworkEntries(phases, requests, document, blockingUrlSet, chainUrlSet);
  placeLongTaskEntries(phases, tasks);

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

  addMilestone("m-ttfb", "TTFB", ttfb, "marker", "requestResponse", ttfb != null ? ratingFor(ttfb, 800, 1800) : undefined);
  addMilestone("m-fcp", "FCP", fcp, "cwv", "firstRender", fcp != null ? ratingFor(fcp, 1800, 3000) : undefined);
  addMilestone("m-dcl", "DCL", dcl, "marker", "parsingComplete");
  addMilestone("m-lcp", "LCP", lcp, "cwv", "subresources", lcp != null ? ratingFor(lcp, 2500, 4000) : undefined);
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
      isLinkPreload: r.isLinkPreload,
      isRenderBlocking: blockingUrlSet.has(r.url) || r.resourceType === "Stylesheet",
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
