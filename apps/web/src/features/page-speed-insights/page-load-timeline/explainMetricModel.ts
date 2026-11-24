import { FIXES } from "@/features/page-speed-insights/dashboard-view/investigate/diagnosisModel";
import { blockingWindowFromMetricsAudit } from "@/features/page-speed-insights/mainThreadTaskSummary";
import {
  formatBytes,
  formatMs,
  formatNetworkPriority,
  shortUrl,
} from "@/features/page-speed-insights/shared/format";
import { buildTimeAxisTicks } from "@/features/page-speed-insights/waterfall/waterfallData";
import type { AuditResultsRecord } from "@/lib/schema";
import { urlsMatch } from "./collectTimelineSources";
import type { CombinedLoad, CombinedRequest } from "./timelineSourceTypes";

export type ExplainMode = "LCP" | "FCP" | "TBT";
export const EXPLAIN_MODES: readonly ExplainMode[] = ["LCP", "FCP", "TBT"];

const MAX_REQUEST_ROWS = 20;
const MAX_TASK_ROWS = 12;

export type ExplainRow = {
  id: string;
  kind: "request" | "task";
  name: string;
  type: string;
  startMs: number;
  endMs: number;
  relevant: boolean;
  note?: string;
};

export type ExplainMarker = { id: string; label: string; timeMs: number };
export type ExplainPhase = { id: string; label: string; startMs: number; endMs: number };
export type ExplainFrame = { timeMs: number; data: string };

export type ExplainDetails = {
  kind: "request" | "task";
  name: string;
  facts: { k: string; v: string }[];
  why: string;
  fix: string;
  auditId: string;
};

export type ExplainView = {
  mode: ExplainMode;
  headline: string;
  sub: string;
  rows: ExplainRow[];
  markers: ExplainMarker[];
  phases: ExplainPhase[];
  frames: ExplainFrame[];
  ticks: number[];
  axisEndMs: number;
  details: (rowId: string) => ExplainDetails | null;
};

const PHASE_HEADLINES: Record<string, string> = {
  timeToFirstByte: "the server was slow to send the first byte",
  resourceLoadDelay: "the LCP resource request started late",
  resourceLoadDuration: "the LCP resource took long to download",
  elementRenderDelay: "the page waited too long to paint the element after it loaded",
};

const finite = (n: number | undefined): n is number => n != null && Number.isFinite(n);

function sortedByStart<T extends { startMs: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.startMs - b.startMs);
}

/** The request that delivered the LCP element: the non-document request ending nearest the load-end. */
function findLcpRequest(load: CombinedLoad): CombinedRequest | undefined {
  const loadPhase = load.lcpSegments.find((s) => s.subpart === "resourceLoadDuration");
  if (!loadPhase) return undefined;
  const candidates = load.requests.filter((r) => r !== load.document && finite(r.networkEndTime));
  const nearest = (list: CombinedRequest[]) =>
    list.sort(
      (a, b) =>
        Math.abs(a.networkEndTime - loadPhase.endMs) - Math.abs(b.networkEndTime - loadPhase.endMs),
    )[0];
  return nearest(candidates.filter((r) => r.resourceType === "Image")) ?? nearest(candidates);
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function buildExplainView(
  load: CombinedLoad,
  mode: ExplainMode,
  audits?: AuditResultsRecord,
): ExplainView {
  const { fcp, lcp } = load;
  const lcpRequest = mode === "LCP" ? findLcpRequest(load) : undefined;
  const renderDelay = load.lcpSegments.find((s) => s.subpart === "elementRenderDelay");
  const lcpWindow = {
    start: renderDelay?.startMs ?? lcpRequest?.networkEndTime ?? fcp ?? 0,
    end: lcp ?? 0,
  };
  const blockWindow =
    blockingWindowFromMetricsAudit(audits?.metrics) ??
    (finite(fcp) && finite(load.interactive) && load.interactive > fcp
      ? { startMs: fcp, endMs: load.interactive }
      : undefined);

  const blockingTasks = load.longTasks.filter(
    (t) =>
      blockWindow != null &&
      t.duration >= 50 &&
      overlaps(t.startTime, t.startTime + t.duration, blockWindow.startMs, blockWindow.endMs),
  );

  const requestRelevant = (r: CombinedRequest): boolean => {
    const blocking = r.renderBlocking === "blocking";
    if (mode === "LCP") {
      return (
        r === load.document ||
        r === lcpRequest ||
        blocking ||
        (r.isCriticalChain && (!finite(lcp) || r.networkEndTime <= lcp))
      );
    }
    if (mode === "FCP") {
      return r === load.document || (blocking && (!finite(fcp) || r.networkEndTime <= fcp));
    }
    return blockingTasks.some((t) => t.url != null && urlsMatch(r.url, t.url));
  };
  const taskRelevant = (t: CombinedLoad["longTasks"][number]): boolean => {
    const end = t.startTime + t.duration;
    if (mode === "LCP") return overlaps(t.startTime, end, lcpWindow.start, lcpWindow.end);
    if (mode === "FCP") return finite(fcp) && t.startTime < fcp;
    return blockingTasks.includes(t);
  };

  const requestNote = (r: CombinedRequest): string | undefined => {
    if (r === lcpRequest) return `LCP resource · starts ${formatMs(r.networkRequestTime)}`;
    if (r.renderBlocking === "blocking") {
      return `render-blocking ${formatMs(r.networkEndTime - r.networkRequestTime)}`;
    }
    if (r === load.document) return `document · TTFB ${formatMs(load.ttfb ?? 0)}`;
    if (r.isCriticalChain && mode === "LCP") return "critical chain";
    return undefined;
  };

  const requestRows: ExplainRow[] = load.requests
    .map((r, i) => ({
      id: `req:${i}`,
      kind: "request" as const,
      name: shortUrl(r.url),
      type: r.resourceType ?? "Other",
      startMs: r.networkRequestTime,
      endMs: r.networkEndTime,
      relevant: requestRelevant(r),
      note: requestNote(r),
    }))
    .filter((row) => finite(row.startMs) && finite(row.endMs));
  const keptRequests = new Set<string>(requestRows.filter((r) => r.relevant).map((r) => r.id));
  for (const row of sortedByStart(requestRows)) {
    if (keptRequests.size >= MAX_REQUEST_ROWS) break;
    keptRequests.add(row.id);
  }

  const taskRows: ExplainRow[] = load.longTasks.map((t, i) => ({
    id: `task:${i}`,
    kind: "task" as const,
    name: t.url ? shortUrl(t.url) : "Main thread task",
    type: "Task",
    startMs: t.startTime,
    endMs: t.startTime + t.duration,
    relevant: taskRelevant(t),
    note: `long task ${formatMs(t.duration)}`,
  }));
  const keptTasks = [...taskRows]
    .sort(
      (a, b) =>
        Number(b.relevant) - Number(a.relevant) || b.endMs - b.startMs - (a.endMs - a.startMs),
    )
    .slice(0, MAX_TASK_ROWS);

  const rows = [
    ...sortedByStart(requestRows.filter((r) => keptRequests.has(r.id))),
    ...sortedByStart(keptTasks),
  ];

  const markers: ExplainMarker[] = [
    ...(finite(load.ttfb) ? [{ id: "ttfb", label: "TTFB", timeMs: load.ttfb }] : []),
    ...(finite(fcp) ? [{ id: "fcp", label: "FCP", timeMs: fcp }] : []),
    ...(finite(lcp) ? [{ id: "lcp", label: "LCP", timeMs: lcp }] : []),
  ];
  const phases: ExplainPhase[] =
    mode === "LCP"
      ? load.lcpSegments.map((s) => ({
          id: s.subpart,
          label: s.label,
          startMs: s.startMs,
          endMs: s.endMs,
        }))
      : [];
  const frames = load.screenshots.map((s) => ({ timeMs: s.timing, data: s.data }));

  const axisMax = Math.max(
    lcp ?? 0,
    fcp ?? 0,
    mode === "TBT" ? (blockWindow?.endMs ?? 0) : 0,
    ...rows.filter((r) => r.relevant).map((r) => r.endMs),
    ...(finite(lcp) || finite(fcp) ? [] : rows.map((r) => r.endMs)),
  );
  const ticks = buildTimeAxisTicks(0, Math.max(axisMax * 1.05, 1));
  const axisEndMs = ticks[ticks.length - 1] ?? axisMax;

  const { headline, sub } = describe(load, mode, blockingTasks);

  const failures = load.lcpDiscoveryFailures;
  const auditFor = (row: ExplainRow, req?: CombinedRequest): string => {
    if (row.kind === "task") return mode === "TBT" ? "main-thread-tasks" : "bootup-time";
    if (req === load.document) return "document-latency-insight";
    if (req === lcpRequest) {
      return failures.length || req?.resourceType !== "Image"
        ? "lcp-discovery-insight"
        : "image-delivery-insight";
    }
    if (req?.renderBlocking === "blocking") return "render-blocking-insight";
    return "";
  };

  const details = (rowId: string): ExplainDetails | null => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return null;
    const index = Number(rowId.split(":")[1]);
    const auditId = auditFor(row, row.kind === "request" ? load.requests[index] : undefined);
    const fix =
      (auditId && FIXES[auditId]) ||
      "No specific fix; this request is not a cause for the selected metric.";
    const common = [
      { k: "Start", v: formatMs(row.startMs) },
      { k: "Duration", v: formatMs(row.endMs - row.startMs) },
    ];
    if (row.kind === "task") {
      const task = load.longTasks[index];
      return {
        kind: "task",
        name: row.name,
        facts: [...(task?.url ? [{ k: "Script", v: task.url }] : []), ...common],
        why: row.relevant
          ? `This ${formatMs(row.endMs - row.startMs)} task kept the main thread busy ${taskWhy(mode)}.`
          : `This task runs outside the window that decides ${mode}.`,
        fix,
        auditId,
      };
    }
    const req = load.requests[index];
    return {
      kind: "request",
      name: row.name,
      facts: [
        { k: "URL", v: req.url },
        { k: "Type", v: req.resourceType ?? "Other" },
        ...common,
        ...(req.transferSize != null
          ? [{ k: "Transfer size", v: formatBytes(req.transferSize) }]
          : []),
        ...(req.priority ? [{ k: "Priority", v: formatNetworkPriority(req.priority) }] : []),
        { k: "Render-blocking", v: req.renderBlocking },
        ...(req.chain?.endMs != null
          ? [
              {
                k: "Critical chain",
                v: `ends ${formatMs(req.chain.endMs)}${req.chain.isLongest ? " (longest)" : ""}`,
              },
            ]
          : []),
      ],
      why: requestWhy(row, req, mode, load, lcpRequest),
      fix,
      auditId,
    };
  };

  return { mode, headline, sub, rows, markers, phases, frames, ticks, axisEndMs, details };
}

function taskWhy(mode: ExplainMode): string {
  if (mode === "TBT")
    return "between FCP and Time to Interactive, which counts toward Total Blocking Time";
  if (mode === "FCP") return "before the first paint";
  return "while the page was waiting to paint the LCP element";
}

function requestWhy(
  row: ExplainRow,
  req: CombinedRequest,
  mode: ExplainMode,
  load: CombinedLoad,
  lcpRequest: CombinedRequest | undefined,
): string {
  if (!row.relevant) return `This request does not delay ${mode}.`;
  if (req === lcpRequest) {
    return `This is the resource behind the LCP element. It started at ${formatMs(row.startMs)} and finished at ${formatMs(row.endMs)}, so LCP cannot happen before that.`;
  }
  if (req === load.document)
    return `Nothing else can start until the document arrives (${formatMs(row.endMs)}).`;
  if (req.renderBlocking === "blocking") {
    return `The browser will not paint until this ${req.resourceType ?? "resource"} finishes (${formatMs(row.endMs - row.startMs)}).`;
  }
  if (mode === "TBT") return "This script ran long tasks that count toward Total Blocking Time.";
  return "This request is on the critical request chain leading to the LCP resource.";
}

function describe(
  load: CombinedLoad,
  mode: ExplainMode,
  blockingTasks: CombinedLoad["longTasks"],
): { headline: string; sub: string } {
  if (mode === "LCP") {
    if (!finite(load.lcp))
      return { headline: "No LCP recorded", sub: "Lighthouse did not report LCP for this run." };
    const biggest = [...load.lcpSegments].sort((a, b) => b.durationMs - a.durationMs)[0];
    const cause = biggest ? PHASE_HEADLINES[biggest.subpart] : undefined;
    return {
      headline: `LCP at ${formatMs(load.lcp)}${cause ? `: ${cause}` : ""}`,
      sub: biggest
        ? `Biggest part: ${biggest.label} took ${formatMs(biggest.durationMs)}${load.lcpElementLabel ? ` · element: ${load.lcpElementLabel}` : ""}.`
        : "No LCP breakdown in this report.",
    };
  }
  if (mode === "FCP") {
    if (!finite(load.fcp))
      return { headline: "No FCP recorded", sub: "Lighthouse did not report FCP for this run." };
    const fcp = load.fcp;
    const blocking = load.requests.filter(
      (r) => r.renderBlocking === "blocking" && r.networkEndTime <= fcp,
    );
    const total = blocking.length
      ? Math.max(...blocking.map((r) => r.networkEndTime)) -
        Math.min(...blocking.map((r) => r.networkRequestTime))
      : 0;
    return {
      headline: `FCP at ${formatMs(fcp)}${blocking.length ? `: ${blocking.length} render-blocking request${blocking.length === 1 ? "" : "s"} came first` : ""}`,
      sub: blocking.length
        ? `Render-blocking requests spanned ${formatMs(total)} before first paint.`
        : "No render-blocking requests finished before first paint.",
    };
  }
  const total = blockingTasks.reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0);
  const worst = [...blockingTasks].sort((a, b) => b.duration - a.duration)[0];
  return {
    headline: blockingTasks.length
      ? `${formatMs(total)} of blocking time across ${blockingTasks.length} long task${blockingTasks.length === 1 ? "" : "s"}`
      : "No long tasks between FCP and Time to Interactive",
    sub: worst
      ? `Worst task: ${formatMs(worst.duration)}${worst.url ? ` from ${shortUrl(worst.url)}` : ""}.`
      : "Total Blocking Time counts main-thread work over 50 ms in that window.",
  };
}
