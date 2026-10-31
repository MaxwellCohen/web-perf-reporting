import type { RenderBlockingStatus } from "@/features/page-speed-insights/page-load-timeline/types";
import type { WaterfallRow, WaterfallSegment } from "@/features/page-speed-insights/waterfall/waterfallData";

/** Row signals a user can isolate in the waterfall. Empty selection shows every row. */
const WATERFALL_SIGNALS = [
  "render-blocking",
  "before-fcp",
  "before-lcp",
  "fcp-to-lcp",
  "chain",
  "longest",
  "queue",
  "long-task",
  "short-task",
  "user-timing",
  "preload",
  "unused",
  "high-priority",
  "script-cpu",
] as const;

export type WaterfallSignalId = (typeof WATERFALL_SIGNALS)[number];

export type WaterfallSignalContext = {
  fcpMs?: number;
  lcpMs?: number;
};

export const WATERFALL_SIGNAL_LABEL: Record<WaterfallSignalId, string> = {
  "render-blocking": "Render-blocking",
  "before-fcp": "Active before FCP",
  "before-lcp": "Active before LCP",
  "fcp-to-lcp": "Between FCP and LCP",
  chain: "Critical chain",
  longest: "Longest path",
  queue: "Queue",
  "long-task": "Long task",
  "short-task": "Short task",
  "user-timing": "User timing",
  preload: "Preload",
  unused: "Unused code",
  "high-priority": "High priority",
  "script-cpu": "Script CPU",
};

const SIGNAL_IDS = new Set<string>(WATERFALL_SIGNALS);

const MILESTONE_SIGNALS = new Set<WaterfallSignalId>([
  "before-fcp",
  "before-lcp",
  "fcp-to-lcp",
]);

export function normalizeWaterfallSignals(values: readonly string[]): WaterfallSignalId[] {
  const selected = new Set(values);
  return WATERFALL_SIGNALS.filter((id) => selected.has(id));
}

function queued(start?: number, end?: number): boolean {
  return start != null && end != null && end > start;
}

function highPriority(priority?: string): boolean {
  return priority === "High" || priority === "VeryHigh";
}

function unusedCode(coverage?: string): boolean {
  return coverage != null && coverage.includes("unused");
}

function onChain(isCriticalChain?: boolean, chain: WaterfallSegment["chain"] = undefined): boolean {
  return Boolean(isCriticalChain || chain);
}

function rowRange(row: WaterfallRow, segment?: WaterfallSegment): { start: number; end: number } {
  if (segment) {
    const start = segment.queueStart ?? segment.start;
    return { start, end: Math.max(segment.end, segment.start) };
  }
  const start = row.queueStart ?? row.networkStart;
  return { start, end: Math.max(row.networkEnd, row.networkStart) };
}

function overlapsEndBefore(endMs: number, start: number, end: number): boolean {
  return endMs > 0 && start < endMs && end > 0;
}

function overlapsWindow(winStart: number, winEnd: number, start: number, end: number): boolean {
  return winEnd > winStart && start < winEnd && end > winStart;
}

function isRenderBlockingRow(row: WaterfallRow, segment?: WaterfallSegment): boolean {
  if (row.kind === "task") return true;
  const status = segment?.renderBlocking ?? row.renderBlocking;
  return status === "blocking" || status === "potentially-blocking";
}

function milestoneSignalAvailable(signal: WaterfallSignalId, context?: WaterfallSignalContext): boolean {
  if (!MILESTONE_SIGNALS.has(signal)) return false;
  const fcp = context?.fcpMs;
  const lcp = context?.lcpMs;
  if (signal === "before-fcp") return fcp != null && Number.isFinite(fcp) && fcp > 0;
  if (signal === "before-lcp") return lcp != null && Number.isFinite(lcp) && lcp > 0;
  if (signal === "fcp-to-lcp") {
    return (
      fcp != null &&
      lcp != null &&
      Number.isFinite(fcp) &&
      Number.isFinite(lcp) &&
      lcp > fcp
    );
  }
  return false;
}

function matchesSignal(
  row: WaterfallRow,
  segment: WaterfallSegment | undefined,
  signal: WaterfallSignalId,
  context?: WaterfallSignalContext,
): boolean {
  const { start, end } = rowRange(row, segment);

  switch (signal) {
    case "render-blocking":
      return isRenderBlockingRow(row, segment);
    case "before-fcp": {
      const fcp = context?.fcpMs;
      if (fcp == null || !Number.isFinite(fcp)) return false;
      return overlapsEndBefore(fcp, start, end);
    }
    case "before-lcp": {
      const lcp = context?.lcpMs;
      if (lcp == null || !Number.isFinite(lcp)) return false;
      return overlapsEndBefore(lcp, start, end);
    }
    case "fcp-to-lcp": {
      const fcp = context?.fcpMs;
      const lcp = context?.lcpMs;
      if (fcp == null || lcp == null || !Number.isFinite(fcp) || !Number.isFinite(lcp) || lcp <= fcp) {
        return false;
      }
      return overlapsWindow(fcp, lcp, start, end);
    }
    case "chain":
      if (row.kind === "user-mark" || row.kind === "user-measure") return false;
      return segment
        ? onChain(segment.isCriticalChain, segment.chain)
        : onChain(row.isCriticalChain, row.chain);
    case "longest":
      return Boolean((segment ? segment.chain : row.chain)?.isLongest);
    case "queue":
      return segment
        ? queued(segment.queueStart, segment.queueEnd)
        : queued(row.queueStart, row.queueEnd);
    case "long-task":
      if (row.kind !== "task") return false;
      return segment
        ? segment.taskKind === "long"
        : (row.segments ?? []).some((item) => item.taskKind === "long");
    case "short-task":
      if (row.kind !== "task") return false;
      return segment
        ? segment.taskKind === "short"
        : (row.segments ?? []).some((item) => item.taskKind === "short");
    case "user-timing":
      return row.kind === "user-mark" || row.kind === "user-measure";
    case "preload":
      return segment ? Boolean(segment.isLinkPreload) : Boolean(row.isLinkPreload);
    case "unused":
      return segment ? unusedCode(segment.coverage) : unusedCode(row.coverage);
    case "high-priority":
      return segment ? highPriority(segment.priority) : highPriority(row.priority);
    case "script-cpu":
      return segment ? segment.scriptCpu != null : row.scriptCpu != null;
  }
}

function summarizeBlocking(
  statuses: Array<RenderBlockingStatus | undefined>,
): RenderBlockingStatus | undefined {
  if (statuses.some((status) => status === "blocking")) return "blocking";
  if (statuses.some((status) => status === "potentially-blocking")) return "potentially-blocking";
  if (statuses.some((status) => status === "non-blocking")) return "non-blocking";
  return undefined;
}

function retarget(row: WaterfallRow, segments: WaterfallSegment[]): WaterfallRow {
  const networkStart = Math.min(...segments.map((segment) => segment.start));
  const networkEnd = Math.max(...segments.map((segment) => segment.end));
  const queueStarts = segments.flatMap((segment) =>
    segment.queueStart != null ? [segment.queueStart] : [],
  );
  const queueStart = queueStarts.length ? Math.min(...queueStarts) : undefined;
  const transferSize = segments.reduce((sum, segment) => sum + (segment.transferSize ?? 0), 0);
  const single = segments.length === 1 ? segments[0] : undefined;
  const label =
    row.kind === "task"
      ? segments.length === 1
        ? "Task"
        : `Tasks (${segments.length})`
      : segments.length === 1
        ? (single?.label ?? row.label)
        : `${row.resourceType} · ${segments.length} requests`;

  return {
    ...row,
    label,
    url: segments.length === 1 ? row.url : undefined,
    statusCode: single?.statusCode,
    transferSize: transferSize > 0 ? transferSize : undefined,
    priority: single?.priority,
    coverage: single?.coverage,
    protocol: single?.protocol,
    mimeType: single?.mimeType,
    scriptCpu: single?.scriptCpu,
    chain: segments.find((segment) => segment.chain?.isLongest)?.chain ?? single?.chain,
    isCriticalChain: segments.some((segment) => segment.isCriticalChain) || undefined,
    isLinkPreload: segments.some((segment) => segment.isLinkPreload) || undefined,
    renderBlocking: summarizeBlocking(segments.map((segment) => segment.renderBlocking)),
    networkStart,
    networkEnd,
    queueStart,
    queueEnd: queueStart != null ? networkStart : undefined,
    duration: Math.max(0, networkEnd - (queueStart ?? networkStart)),
    segments,
  };
}

function rowMatchesAnySignal(
  row: WaterfallRow,
  signals: readonly WaterfallSignalId[],
  context?: WaterfallSignalContext,
): boolean {
  const segments = row.segments ?? [];
  if (!segments.length) {
    return signals.some((signal) => matchesSignal(row, undefined, signal, context));
  }
  return segments.some((segment) =>
    signals.some((signal) => matchesSignal(row, segment, signal, context)),
  );
}

function narrowRow(
  row: WaterfallRow,
  signals: readonly WaterfallSignalId[],
  context?: WaterfallSignalContext,
): WaterfallRow | null {
  if (row.kind === "user-mark" || row.kind === "user-measure") {
    return rowMatchesAnySignal(row, signals, context) ? row : null;
  }

  const segments = row.segments ?? [];
  if (!segments.length) {
    return signals.some((signal) => matchesSignal(row, undefined, signal, context)) ? row : null;
  }

  const kept = segments.filter((segment) =>
    signals.some((signal) => matchesSignal(row, segment, signal, context)),
  );
  if (!kept.length) return null;
  if (kept.length === segments.length) return row;
  return retarget(row, kept);
}

function signalPresentOnRows(
  rows: WaterfallRow[],
  signal: WaterfallSignalId,
  context?: WaterfallSignalContext,
): boolean {
  if (milestoneSignalAvailable(signal, context)) return true;
  for (const row of rows) {
    const segments = row.segments ?? [];
    const hit = segments.length
      ? segments.some((segment) => matchesSignal(row, segment, signal, context))
      : matchesSignal(row, undefined, signal, context);
    if (hit) return true;
  }
  return false;
}

/** Signals that match at least one row. Order follows {@link WATERFALL_SIGNALS}. */
export function availableWaterfallSignals(
  rows: WaterfallRow[],
  context?: WaterfallSignalContext,
): WaterfallSignalId[] {
  return WATERFALL_SIGNALS.filter((signal) => signalPresentOnRows(rows, signal, context));
}

/**
 * Keep rows that match any selected signal.
 * Grouped rows drop segments that match none of them.
 * An empty or unknown selection leaves the rows unchanged.
 */
export function filterWaterfallRowsBySignals(
  rows: WaterfallRow[],
  selected: readonly string[],
  context?: WaterfallSignalContext,
): WaterfallRow[] {
  const signals = normalizeWaterfallSignals(selected);
  if (!signals.length) return rows;

  const visible: WaterfallRow[] = [];
  for (const row of rows) {
    const next = narrowRow(row, signals, context);
    if (next) visible.push(next);
  }
  return visible;
}

export function isWaterfallSignalId(value: string): value is WaterfallSignalId {
  return SIGNAL_IDS.has(value);
}
