import type { RenderBlockingStatus } from "@/features/page-speed-insights/page-load-timeline/types";
import type { WaterfallRow, WaterfallSegment } from "@/features/page-speed-insights/waterfall/waterfallData";

/** Row signals a user can isolate in the waterfall. Empty selection shows every row. */
export const WATERFALL_SIGNALS = [
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

export const WATERFALL_SIGNAL_LABEL: Record<WaterfallSignalId, string> = {
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

function matchesSignal(
  row: WaterfallRow,
  segment: WaterfallSegment | undefined,
  signal: WaterfallSignalId,
): boolean {
  switch (signal) {
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

function narrowRow(row: WaterfallRow, signals: readonly WaterfallSignalId[]): WaterfallRow | null {
  if (row.kind === "user-mark" || row.kind === "user-measure") {
    return signals.includes("user-timing") ? row : null;
  }

  const segments = row.segments ?? [];
  if (!segments.length) {
    return signals.some((signal) => matchesSignal(row, undefined, signal)) ? row : null;
  }

  const kept = segments.filter((segment) =>
    signals.some((signal) => matchesSignal(row, segment, signal)),
  );
  if (!kept.length) return null;
  if (kept.length === segments.length) return row;
  return retarget(row, kept);
}

/** Signals that match at least one row. Order follows {@link WATERFALL_SIGNALS}. */
export function availableWaterfallSignals(rows: WaterfallRow[]): WaterfallSignalId[] {
  const present = new Set<WaterfallSignalId>();
  for (const row of rows) {
    for (const signal of WATERFALL_SIGNALS) {
      if (present.has(signal)) continue;
      const segments = row.segments ?? [];
      const hit = segments.length
        ? segments.some((segment) => matchesSignal(row, segment, signal))
        : matchesSignal(row, undefined, signal);
      if (hit) present.add(signal);
    }
  }
  return WATERFALL_SIGNALS.filter((id) => present.has(id));
}

/**
 * Keep rows that match any selected signal.
 * Grouped rows drop segments that match none of them.
 * An empty or unknown selection leaves the rows unchanged.
 */
export function filterWaterfallRowsBySignals(
  rows: WaterfallRow[],
  selected: readonly string[],
): WaterfallRow[] {
  const signals = normalizeWaterfallSignals(selected);
  if (!signals.length) return rows;

  const visible: WaterfallRow[] = [];
  for (const row of rows) {
    const next = narrowRow(row, signals);
    if (next) visible.push(next);
  }
  return visible;
}

export function isWaterfallSignalId(value: string): value is WaterfallSignalId {
  return SIGNAL_IDS.has(value);
}
