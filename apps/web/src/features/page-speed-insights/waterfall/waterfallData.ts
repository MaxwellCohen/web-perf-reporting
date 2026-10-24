import {
  getNetworkRequestsTimeRange,
  type NetworkRequestTimeRange,
} from "@/features/page-speed-insights/shared/networkRequestsTable";
import { formatBytes, formatCoverage, coverageLabel, shortUrl } from "@/features/page-speed-insights/shared/format";
import type {
  CombinedLoad,
  CombinedLongTask,
  CombinedRequest,
  UserTiming,
} from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";
import { groupDownloads } from "@/features/page-speed-insights/page-load-timeline/groupDownloads";
import { isLongTask } from "@/features/page-speed-insights/page-load-timeline/groupMainThreadTasks";
import type { RenderBlockingStatus } from "@/features/page-speed-insights/page-load-timeline/types";
import type {
  CriticalChainNode,
  ScriptCpu,
} from "@/features/page-speed-insights/shared/scriptResourceFacts";
import type { TableItem } from "@/lib/schema";
import { getNumber, getUrlString } from "@/lib/utils";

export type WaterfallRowKind =
  | "request"
  | "request-group"
  | "task"
  | "user-mark"
  | "user-measure";

export type WaterfallDensity = "expanded" | "collapsed";

export type WaterfallTaskKind = "short" | "long";

export type WaterfallSegment = {
  id: string;
  start: number;
  end: number;
  label?: string;
  queueStart?: number;
  queueEnd?: number;
  renderBlocking?: RenderBlockingStatus;
  /** Present on task-row segments: short = yellow, long = red. */
  taskKind?: WaterfallTaskKind;
  /** Optional Tailwind color class override (e.g. LCP subparts). */
  colorClass?: string;
  priority?: string;
  coverage?: string;
  protocol?: string;
  mimeType?: string;
  isCriticalChain?: boolean;
  isLinkPreload?: boolean;
  resourceSize?: number;
  transferSize?: number;
  statusCode?: number;
  /** Script download window for attributed long tasks. */
  downloadStartMs?: number;
  downloadEndMs?: number;
  scriptTransferBytes?: number;
  scriptCpu?: ScriptCpu;
  chain?: CriticalChainNode;
};

/** Alias kept for call sites that still say NetworkWaterfallRow. */
export type NetworkWaterfallRow = WaterfallRow;
export type WaterfallRow = {
  id: string;
  kind: WaterfallRowKind;
  label: string;
  resourceType: string;
  url?: string;
  statusCode?: number;
  transferSize?: number;
  resourceSize?: number;
  protocol?: string;
  mimeType?: string;
  priority?: string;
  coverage?: string;
  scriptCpu?: ScriptCpu;
  chain?: CriticalChainNode;
  isCriticalChain?: boolean;
  isLinkPreload?: boolean;
  renderBlocking?: RenderBlockingStatus;
  queueStart?: number;
  queueEnd?: number;
  networkStart: number;
  networkEnd: number;
  duration: number;
  /** Timeline moment id for scroll-to-moment (e.g. `net-0`, `long-task-0`). */
  momentId?: string;
  /** Expanded single request, measures, tasks, or collapsed multi-request / multi-task bars */
  segments?: WaterfallSegment[];
};

export type WaterfallSortBy = "start" | "end" | "duration" | "size";

export type WaterfallFilterOptions = {
  resourceTypes?: string[];
  search?: string;
  /** Keep render-blocking / potentially-blocking requests and main-thread tasks. */
  blockingOnly?: boolean;
};

function queueWindow(
  rendererStart: number | undefined,
  networkStart: number,
): { queueStart?: number; queueEnd?: number } {
  if (
    rendererStart != null &&
    Number.isFinite(rendererStart) &&
    rendererStart < networkStart
  ) {
    return { queueStart: rendererStart, queueEnd: networkStart };
  }
  return {};
}

function summarizeBlocking(
  statuses: Array<RenderBlockingStatus | undefined>,
): RenderBlockingStatus | undefined {
  if (statuses.some((status) => status === "blocking")) return "blocking";
  if (statuses.some((status) => status === "potentially-blocking")) {
    return "potentially-blocking";
  }
  if (statuses.some((status) => status === "non-blocking")) return "non-blocking";
  return undefined;
}

function requestExtras(request: CombinedRequest) {
  return {
    priority: request.priority,
    coverage: coverageLabel(request),
    protocol: request.protocol,
    mimeType: request.mimeType,
    isCriticalChain: request.isCriticalChain || undefined,
    isLinkPreload: request.isLinkPreload || undefined,
    resourceSize: request.resourceSize,
    scriptCpu: request.scriptCpu,
    chain: request.chain,
  };
}

function requestRowFromCombined(
  request: CombinedRequest,
  index: number,
  momentId: string,
): WaterfallRow {
  const networkStart = request.networkRequestTime;
  const networkEnd = request.networkEndTime;
  const { queueStart, queueEnd } = queueWindow(request.rendererStartTime, networkStart);
  const duration = Math.max(0, networkEnd - (queueStart ?? networkStart));
  const extras = requestExtras(request);

  return {
    id: `request-${index}-${networkStart}-${request.url}`,
    kind: "request",
    label: request.url,
    url: request.url,
    resourceType: request.resourceType?.length ? request.resourceType : "Other",
    statusCode: request.statusCode,
    transferSize: request.transferSize,
    renderBlocking: request.renderBlocking,
    networkStart,
    networkEnd,
    queueStart,
    queueEnd,
    duration,
    momentId,
    ...extras,
    segments: [
      {
        id: `request-${index}-seg`,
        start: networkStart,
        end: networkEnd,
        label: shortUrl(request.url),
        queueStart,
        queueEnd,
        renderBlocking: request.renderBlocking,
        transferSize: request.transferSize,
        statusCode: request.statusCode,
        ...extras,
      },
    ],
  };
}

function requestGroupRow(group: CombinedRequest[], index: number): WaterfallRow {
  const resourceType = group[0]?.resourceType?.length ? group[0].resourceType : "Other";
  const momentId = `net-${index}`;
  const segments = group.map((request, segIndex) => {
    const { queueStart, queueEnd } = queueWindow(
      request.rendererStartTime,
      request.networkRequestTime,
    );
    const extras = requestExtras(request);
    return {
      id: `req-group-${index}-${segIndex}`,
      start: request.networkRequestTime,
      end: request.networkEndTime,
      label: shortUrl(request.url),
      queueStart,
      queueEnd,
      renderBlocking: request.renderBlocking,
      transferSize: request.transferSize,
      statusCode: request.statusCode,
      ...extras,
    } satisfies WaterfallSegment;
  });

  const networkStart = Math.min(...group.map((r) => r.networkRequestTime));
  const networkEnd = Math.max(...group.map((r) => r.networkEndTime));
  const queueStarts = segments
    .map((seg) => seg.queueStart)
    .filter((value): value is number => value != null);
  const queueStart = queueStarts.length ? Math.min(...queueStarts) : undefined;
  const transferSize = group.reduce((sum, r) => sum + (r.transferSize ?? 0), 0);
  const renderBlocking = summarizeBlocking(group.map((r) => r.renderBlocking));
  const single = group.length === 1 ? group[0] : undefined;

  return {
    id: `request-group-${index}-${networkStart}`,
    kind: "request-group",
    label:
      group.length === 1
        ? (group[0]?.url ?? resourceType)
        : `${resourceType} · ${group.length} requests`,
    url: single?.url,
    resourceType,
    transferSize: transferSize > 0 ? transferSize : undefined,
    statusCode: single?.statusCode,
    renderBlocking,
    networkStart,
    networkEnd,
    queueStart,
    queueEnd: queueStart != null ? networkStart : undefined,
    duration: Math.max(0, networkEnd - (queueStart ?? networkStart)),
    momentId,
    ...(single ? requestExtras(single) : {}),
    segments,
  };
}

/** Gaps below this keep consecutive tasks on the same row; ≥ this starts a new row. */
const TASK_ROW_GAP_MS = 50;

function groupTasksByGap(tasks: CombinedLongTask[]): CombinedLongTask[][] {
  const ordered = [...tasks].sort(
    (a, b) => a.startTime - b.startTime || b.duration - a.duration,
  );
  if (!ordered.length) return [];

  const groups: CombinedLongTask[][] = [];
  let current: CombinedLongTask[] = [ordered[0]!];
  let groupEnd = ordered[0]!.startTime + ordered[0]!.duration;

  for (let i = 1; i < ordered.length; i++) {
    const task = ordered[i]!;
    const gap = task.startTime - groupEnd;
    if (gap < TASK_ROW_GAP_MS) {
      current.push(task);
      groupEnd = Math.max(groupEnd, task.startTime + task.duration);
    } else {
      groups.push(current);
      current = [task];
      groupEnd = task.startTime + task.duration;
    }
  }
  groups.push(current);
  return groups;
}

function taskRow(group: CombinedLongTask[], index: number): WaterfallRow {
  const startMs = Math.min(...group.map((t) => t.startTime));
  const endMs = Math.max(...group.map((t) => t.startTime + t.duration));
  const label = group.length === 1 ? "Task" : `Tasks (${group.length})`;
  const hasLong = group.some(isLongTask);
  const renderBlocking: RenderBlockingStatus = hasLong ? "blocking" : "potentially-blocking";
  const momentId = hasLong ? `long-task-${index}` : `short-task-${index}`;

  return {
    id: `tasks-${index}`,
    kind: "task",
    label,
    resourceType: "Task",
    renderBlocking,
    networkStart: startMs,
    networkEnd: endMs,
    duration: Math.max(0, endMs - startMs),
    momentId,
    url: group.length === 1 ? group[0]?.url : undefined,
    coverage: group.length === 1 && group[0]?.coverage ? formatCoverage(group[0].coverage) : undefined,
    scriptCpu: group.length === 1 ? group[0]?.scriptCpu : undefined,
    chain: group.length === 1 ? group[0]?.chain : undefined,
    segments: group.map((task, segIndex) => {
      const long = isLongTask(task);
      return {
        id: `tasks-${index}-${segIndex}`,
        start: task.startTime,
        end: task.startTime + task.duration,
        label: task.url ? shortUrl(task.url) : "Unattributed",
        taskKind: long ? ("long" as const) : ("short" as const),
        renderBlocking: long
          ? ("blocking" as const)
          : ("potentially-blocking" as const),
        downloadStartMs: task.downloadStartMs,
        downloadEndMs: task.downloadEndMs,
        scriptTransferBytes: task.scriptTransferBytes,
        coverage: task.coverage ? formatCoverage(task.coverage) : undefined,
        scriptCpu: task.scriptCpu,
        chain: task.chain,
      };
    }),
  };
}

function userTimingRow(timing: UserTiming, index: number): WaterfallRow {
  const isMeasure =
    timing.timingType.toLowerCase() === "measure" && timing.duration != null;
  const start = timing.startTime;
  const end = isMeasure ? start + timing.duration! : start;

  return {
    id: `user-timing-${index}`,
    kind: isMeasure ? "user-measure" : "user-mark",
    label: timing.name,
    resourceType: "User timing",
    networkStart: start,
    networkEnd: end,
    duration: Math.max(0, end - start),
    segments: isMeasure
      ? [{ id: `user-timing-${index}-seg`, start, end, label: timing.name }]
      : undefined,
  };
}

function sortRowsByStart(rows: WaterfallRow[]): WaterfallRow[] {
  return [...rows].sort(
    (a, b) => a.networkStart - b.networkStart || a.label.localeCompare(b.label),
  );
}

function momentIdByRequestUrl(load: CombinedLoad): Map<string, string> {
  const map = new Map<string, string>();
  groupDownloads(load.requests).forEach((group, index) => {
    const momentId = `net-${index}`;
    for (const request of group) {
      map.set(request.url, momentId);
    }
  });
  return map;
}

export function buildWaterfallRowsFromSources(
  load: CombinedLoad,
  { density }: { density: WaterfallDensity },
): WaterfallRow[] {
  const momentByUrl = momentIdByRequestUrl(load);
  const requestRows =
    density === "collapsed"
      ? groupDownloads(load.requests).map((group, index) => requestGroupRow(group, index))
      : load.requests.map((request, index) =>
          requestRowFromCombined(
            request,
            index,
            momentByUrl.get(request.url) ?? `net-${index}`,
          ),
        );

  const taskGroups =
    density === "collapsed"
      ? groupTasksByGap(load.longTasks)
      : load.longTasks.map((task) => [task]);
  const taskRows = taskGroups.map((group, index) => taskRow(group, index));
  const timingRows = load.userTimings.map((timing, index) => userTimingRow(timing, index));

  return sortRowsByStart([...requestRows, ...taskRows, ...timingRows]);
}

export function normalizeNetworkRequest(row: TableItem, index: number): WaterfallRow {
  const networkStart = getNumber(row.networkRequestTime) ?? 0;
  const networkEnd = getNumber(row.networkEndTime) ?? networkStart;
  const rendererStart = getNumber(row.rendererStartTime);
  const url = getUrlString(row.url) || "Unknown";
  const resourceType =
    typeof row.resourceType === "string" && row.resourceType.length > 0
      ? row.resourceType
      : "Other";

  const { queueStart, queueEnd } = queueWindow(rendererStart, networkStart);
  const duration = Math.max(0, networkEnd - (queueStart ?? networkStart));

  return {
    id: `${index}-${networkStart}-${url}`,
    kind: "request",
    label: url,
    url,
    resourceType,
    statusCode: getNumber(row.statusCode),
    transferSize: getNumber(row.transferSize),
    networkStart,
    networkEnd,
    queueStart,
    queueEnd,
    duration,
    segments: [
      {
        id: `${index}-seg`,
        start: networkStart,
        end: networkEnd,
        label: shortUrl(url),
        queueStart,
        queueEnd,
      },
    ],
  };
}

export function buildWaterfallRows(requests: TableItem[]): WaterfallRow[] {
  return requests.map((row, index) => normalizeNetworkRequest(row, index));
}

export function getWaterfallTimeRange(rows: WaterfallRow[]): NetworkRequestTimeRange | null {
  if (!rows.length) {
    return null;
  }

  return getNetworkRequestsTimeRange(
    rows.map((row) => ({
      networkRequestTime: row.queueStart ?? row.networkStart,
      networkEndTime: Math.max(row.networkEnd, row.networkStart),
    })),
  );
}

function rowMatchesSearch(row: WaterfallRow, query: string): boolean {
  if (row.label.toLowerCase().includes(query)) return true;
  if (row.url?.toLowerCase().includes(query)) return true;
  if (row.priority?.toLowerCase().includes(query)) return true;
  return (row.segments ?? []).some((seg) => seg.label?.toLowerCase().includes(query));
}

function isBlockingStatus(status: RenderBlockingStatus | undefined): boolean {
  return status === "blocking" || status === "potentially-blocking";
}

function filterRowToBlocking(row: WaterfallRow): WaterfallRow | null {
  if (row.kind === "user-mark" || row.kind === "user-measure") return null;
  if (row.kind === "task") return row;

  if (row.kind === "request") {
    return isBlockingStatus(row.renderBlocking) ? row : null;
  }

  const segments = (row.segments ?? []).filter((seg) => isBlockingStatus(seg.renderBlocking));
  if (!segments.length) return null;

  const networkStart = Math.min(...segments.map((seg) => seg.start));
  const networkEnd = Math.max(...segments.map((seg) => seg.end));
  const queueStarts = segments
    .map((seg) => seg.queueStart)
    .filter((value): value is number => value != null);
  const queueStart = queueStarts.length ? Math.min(...queueStarts) : undefined;
  const renderBlocking = summarizeBlocking(segments.map((seg) => seg.renderBlocking));

  return {
    ...row,
    label:
      segments.length === 1
        ? (segments[0]?.label ?? row.label)
        : `${row.resourceType} · ${segments.length} requests`,
    renderBlocking,
    networkStart,
    networkEnd,
    queueStart,
    queueEnd: queueStart != null ? networkStart : undefined,
    duration: Math.max(0, networkEnd - (queueStart ?? networkStart)),
    segments,
  };
}

export function filterWaterfallRows(
  rows: WaterfallRow[],
  { resourceTypes, search, blockingOnly }: WaterfallFilterOptions,
): WaterfallRow[] {
  let filtered = rows;

  if (resourceTypes && resourceTypes.length > 0) {
    const typeSet = new Set(resourceTypes);
    filtered = filtered.filter((row) => {
      if (row.kind === "request" || row.kind === "request-group") {
        return typeSet.has(row.resourceType);
      }
      return true;
    });
  }

  if (blockingOnly) {
    filtered = filtered
      .map((row) => filterRowToBlocking(row))
      .filter((row): row is WaterfallRow => row != null);
  }

  const query = search?.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter((row) => rowMatchesSearch(row, query));
  }

  return filtered;
}

export function filterWaterfallRowsByTimeRange(
  rows: WaterfallRow[],
  startMs: number,
  endMs: number,
): WaterfallRow[] {
  return rows.filter((row) => {
    const rowStart = row.queueStart ?? row.networkStart;
    const rowEnd = Math.max(row.networkEnd, row.networkStart);
    return rowEnd >= startMs && rowStart <= endMs;
  });
}

export function sortWaterfallRows(rows: WaterfallRow[], sortBy: WaterfallSortBy): WaterfallRow[] {
  const sorted = [...rows];

  switch (sortBy) {
    case "duration":
      sorted.sort((a, b) => b.duration - a.duration || a.networkStart - b.networkStart);
      break;
    case "size":
      sorted.sort(
        (a, b) =>
          (b.transferSize ?? 0) - (a.transferSize ?? 0) || a.networkStart - b.networkStart,
      );
      break;
    case "end":
      sorted.sort(
        (a, b) => a.networkEnd - b.networkEnd || a.networkStart - b.networkStart || a.label.localeCompare(b.label),
      );
      break;
    case "start":
    default:
      sorted.sort((a, b) => a.networkStart - b.networkStart || a.label.localeCompare(b.label));
      break;
  }

  return sorted;
}

export function getWaterfallResourceTypes(rows: WaterfallRow[]): string[] {
  return [
    ...new Set(
      rows
        .filter((row) => row.kind === "request" || row.kind === "request-group")
        .map((row) => row.resourceType),
    ),
  ].sort();
}

export function countRequestRows(rows: WaterfallRow[]): number {
  return rows.reduce((sum, row) => {
    if (row.kind === "request") return sum + 1;
    if (row.kind === "request-group") return sum + (row.segments?.length ?? 0);
    return sum;
  }, 0);
}

export function getSegmentStyle(
  start: number,
  end: number,
  minStart: number,
  maxEnd: number,
): { left: string; width: string } {
  const range = maxEnd - minStart;
  if (range <= 0) {
    return { left: "0%", width: "0%" };
  }

  const rawLeft = ((start - minStart) / range) * 100;
  const rawWidth = Math.max(((end - start) / range) * 100, (2 / range) * 100);
  const leftPct = Math.min(100, Math.max(0, rawLeft));
  const widthPct = Math.min(Math.max(0, 100 - leftPct), Math.max(0, rawWidth));

  return {
    left: `${leftPct}%`,
    width: `${widthPct}%`,
  };
}

function niceTickStep(roughStep: number): number {
  const power = 10 ** Math.floor(Math.log10(roughStep));
  const error = roughStep / power;
  if (error >= Math.sqrt(50)) return 10 * power;
  if (error >= Math.sqrt(10)) return 5 * power;
  if (error >= Math.sqrt(2)) return 2 * power;
  return power;
}

export function buildTimeAxisTicks(minStart: number, maxEnd: number, tickCount = 5): number[] {
  const range = maxEnd - minStart;
  if (range <= 0) {
    return [minStart];
  }

  const roughStep = range / Math.max(1, tickCount - 1);
  const step = niceTickStep(roughStep);
  const start = Math.floor(minStart / step) * step;
  const end = Math.ceil(maxEnd / step) * step;

  const ticks: number[] = [];
  for (let tick = start; tick <= end + step * 1e-9; tick += step) {
    ticks.push(Math.round(tick));
  }
  return ticks;
}

/** TimelineWaterfallBar → WaterfallRow for moment mini-charts. */
export function waterfallRowFromTimelineBar(
  bar: {
    id: string;
    label: string;
    href?: string;
    startMs: number;
    endMs: number;
    resourceType?: string;
    coverage?: string;
    priority?: string;
    renderBlocking?: RenderBlockingStatus;
    downloadStartMs?: number;
    downloadEndMs?: number;
    scriptSize?: string;
    scriptCpu?: ScriptCpu;
    chain?: CriticalChainNode;
    queueStartMs?: number;
    queueEndMs?: number;
    taskKind?: WaterfallTaskKind;
    colorClass?: string;
  },
  kind: WaterfallRowKind = "request",
): WaterfallRow {
  const isTask = kind === "task";
  const queueStart = bar.queueStartMs;
  const queueEnd = bar.queueEndMs;
  return {
    id: bar.id,
    kind,
    label: bar.href ?? bar.label,
    url: bar.href,
    resourceType: bar.resourceType ?? (isTask ? "Task" : "Other"),
    renderBlocking: bar.renderBlocking,
    networkStart: bar.startMs,
    networkEnd: bar.endMs,
    queueStart,
    queueEnd,
    duration: Math.max(0, bar.endMs - (queueStart ?? bar.startMs)),
    coverage: bar.coverage,
    priority: bar.priority,
    scriptCpu: bar.scriptCpu,
    chain: bar.chain,
    isCriticalChain: bar.chain ? true : undefined,
    segments: [
      {
        id: `${bar.id}-seg`,
        start: bar.startMs,
        end: bar.endMs,
        label: bar.label,
        queueStart,
        queueEnd,
        renderBlocking: bar.renderBlocking,
        taskKind: isTask ? (bar.taskKind ?? "long") : undefined,
        coverage: bar.coverage,
        priority: bar.priority,
        downloadStartMs: bar.downloadStartMs,
        downloadEndMs: bar.downloadEndMs,
        scriptCpu: bar.scriptCpu,
        chain: bar.chain,
        isCriticalChain: bar.chain ? true : undefined,
        colorClass: bar.colorClass,
      },
    ],
  };
}

const LCP_SEGMENT_COLOR: Record<string, string> = {
  timeToFirstByte: "bg-sky-500/80",
  resourceLoadDelay: "bg-violet-500/80",
  resourceLoadDuration: "bg-emerald-500/80",
  elementRenderDelay: "bg-rose-500/80",
};

/** LCP subparts → one multi-segment waterfall row on the absolute timeline. */
export function waterfallRowFromLcpSegments(
  segments: Array<{
    subpart: string;
    label: string;
    durationMs: number;
    startMs: number;
    endMs: number;
  }>,
): WaterfallRow | null {
  if (!segments.length) return null;
  const networkStart = Math.min(...segments.map((seg) => seg.startMs));
  const networkEnd = Math.max(...segments.map((seg) => seg.endMs));
  return {
    id: "lcp-breakdown",
    kind: "request-group",
    label: "LCP breakdown",
    resourceType: "LCP",
    networkStart,
    networkEnd,
    duration: Math.max(0, networkEnd - networkStart),
    segments: segments.map((seg) => ({
      id: `lcp-${seg.subpart}`,
      start: seg.startMs,
      end: seg.endMs,
      label: seg.label,
      colorClass: LCP_SEGMENT_COLOR[seg.subpart] ?? "bg-muted-foreground/60",
    })),
  };
}
