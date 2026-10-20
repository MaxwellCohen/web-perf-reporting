import type {
  TaskFilterId,
  TaskFilterSelection,
} from "@/features/page-speed-insights/page-load-timeline/filterTimelineMoments";
import { TASK_FILTERS } from "@/features/page-speed-insights/page-load-timeline/filterTimelineMoments";
import type { WaterfallRow } from "@/features/page-speed-insights/waterfall/waterfallData";

function allEnabled(enabled: TaskFilterSelection): boolean {
  return TASK_FILTERS.every((id) => enabled.has(id));
}

function isAlwaysVisibleRequest(row: WaterfallRow): boolean {
  return row.resourceType === "Document" || !row.renderBlocking;
}

function keepRequestRow(row: WaterfallRow, enabled: TaskFilterSelection): WaterfallRow | null {
  if (row.kind !== "request" && row.kind !== "request-group") return row;
  if (isAlwaysVisibleRequest(row)) return row;

  if (row.kind === "request") {
    return row.renderBlocking != null && enabled.has(row.renderBlocking) ? row : null;
  }

  const segments = (row.segments ?? []).filter((seg) => {
    if (!seg.renderBlocking) return true;
    if (row.resourceType === "Document") return true;
    return enabled.has(seg.renderBlocking);
  });
  if (!segments.length) return null;
  if (segments.length === row.segments?.length) return row;

  const networkStart = Math.min(...segments.map((seg) => seg.start));
  const networkEnd = Math.max(...segments.map((seg) => seg.end));
  return {
    ...row,
    networkStart,
    networkEnd,
    duration: Math.max(0, networkEnd - (row.queueStart ?? networkStart)),
    segments,
    label:
      segments.length === 1
        ? (segments[0]?.label ?? row.label)
        : `${row.resourceType} · ${segments.length} requests`,
  };
}

export function filterWaterfallRowsByTasks(
  rows: WaterfallRow[],
  enabled: TaskFilterSelection,
): WaterfallRow[] {
  if (allEnabled(enabled)) return rows;

  const next: WaterfallRow[] = [];
  for (const row of rows) {
    if (row.kind === "task") {
      const hasLong = row.segments?.some((seg) => seg.taskKind === "long");
      if (hasLong) {
        if (enabled.has("long-task")) next.push(row);
      } else if (enabled.has("potentially-blocking")) {
        next.push(row);
      }
      continue;
    }
    if (row.kind === "user-mark" || row.kind === "user-measure") {
      next.push(row);
      continue;
    }
    const kept = keepRequestRow(row, enabled);
    if (kept) next.push(kept);
  }
  return next;
}

export function availableWaterfallTaskFilters(rows: WaterfallRow[]): TaskFilterId[] {
  const present = new Set<TaskFilterId>();
  for (const row of rows) {
    if (row.kind === "task") {
      if (row.segments?.some((seg) => seg.taskKind === "long")) present.add("long-task");
      else present.add("potentially-blocking");
    }
    if (row.kind === "request" || row.kind === "request-group") {
      if (row.resourceType === "Document" || !row.renderBlocking) continue;
      if (row.renderBlocking) present.add(row.renderBlocking);
      for (const seg of row.segments ?? []) {
        if (seg.renderBlocking) present.add(seg.renderBlocking);
      }
    }
  }
  return TASK_FILTERS.filter((id) => present.has(id));
}
