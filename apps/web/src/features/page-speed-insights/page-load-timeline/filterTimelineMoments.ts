import type { TimelineMoment, TimelineWaterfallBar } from "./types";

/** Categories a user can show or hide. Milestones, screenshots, and the document stay visible. */
export const TASK_FILTERS = ["blocking", "potentially-blocking", "non-blocking", "long-task"] as const;

export type TaskFilterId = (typeof TASK_FILTERS)[number];

export type TaskFilterSelection = ReadonlySet<TaskFilterId>;

export const TASK_FILTER_LABEL: Record<TaskFilterId, string> = {
  blocking: "Blocking",
  "potentially-blocking": "Potentially blocking",
  "non-blocking": "Non-blocking",
  "long-task": "Long tasks",
};

export function allTaskFilters(): TaskFilterSelection {
  return new Set(TASK_FILTERS);
}

/** Filters that have something to hide on this timeline. */
export function availableTaskFilters(moments: TimelineMoment[]): TaskFilterId[] {
  const present = new Set<TaskFilterId>();
  for (const moment of moments) {
    if (moment.id.startsWith("long-task-")) present.add("long-task");
    for (const bar of moment.waterfall ?? []) {
      if (bar.resourceType === "Document" || !bar.renderBlocking) continue;
      present.add(bar.renderBlocking);
    }
  }
  return TASK_FILTERS.filter((id) => present.has(id));
}

function allEnabled(enabled: TaskFilterSelection): boolean {
  return TASK_FILTERS.every((id) => enabled.has(id));
}

/** The document row carries TTFB and server think time, so it stays with the navigation. */
function isAlwaysVisibleBar(bar: TimelineWaterfallBar): boolean {
  return bar.resourceType === "Document" || !bar.renderBlocking;
}

function keepBar(bar: TimelineWaterfallBar, enabled: TaskFilterSelection): boolean {
  if (isAlwaysVisibleBar(bar)) return true;
  return bar.renderBlocking != null && enabled.has(bar.renderBlocking);
}

function hiddenDetail(detail: string, hidden: number): string {
  const note = `${hidden} hidden`;
  if (detail.endsWith(".")) return `${detail.slice(0, -1)} (${note}).`;
  return detail ? `${detail} (${note}).` : `${note}.`;
}

function filterDownloadMoment(
  moment: TimelineMoment,
  enabled: TaskFilterSelection,
): TimelineMoment | null {
  const bars = moment.waterfall ?? [];
  const filterable = bars.some((bar) => !isAlwaysVisibleBar(bar));
  if (!filterable) return moment;

  const kept: number[] = [];
  bars.forEach((bar, index) => {
    if (keepBar(bar, enabled)) kept.push(index);
  });

  if (kept.length === bars.length) return moment;
  if (kept.length === 0) {
    if (!moment.notes?.length) return null;
    return { ...moment, waterfall: undefined, table: undefined };
  }

  const table = moment.table;
  return {
    ...moment,
    detail: hiddenDetail(moment.detail, bars.length - kept.length),
    waterfall: kept.map((index) => bars[index]!),
    table: table
      ? {
          ...table,
          rows: kept.flatMap((index) => {
            const row = table.rows[index];
            return row ? [row] : [];
          }),
        }
      : undefined,
  };
}

function filterMoment(moment: TimelineMoment, enabled: TaskFilterSelection): TimelineMoment | null {
  if (moment.id.startsWith("long-task-")) {
    return enabled.has("long-task") ? moment : null;
  }
  return filterDownloadMoment(moment, enabled);
}

function withPhaseStarts(moments: TimelineMoment[]): TimelineMoment[] {
  const seen = new Set<string>();
  return moments.map((moment) => {
    const isPhaseStart = !seen.has(moment.phaseId);
    seen.add(moment.phaseId);
    if (moment.isPhaseStart === isPhaseStart) return moment;
    return { ...moment, isPhaseStart };
  });
}

export function filterTimelineMoments(
  moments: TimelineMoment[],
  enabled: TaskFilterSelection,
): TimelineMoment[] {
  if (allEnabled(enabled)) return moments;

  const visible: TimelineMoment[] = [];
  for (const moment of moments) {
    const next = filterMoment(moment, enabled);
    if (next) visible.push(next);
  }
  return withPhaseStarts(visible);
}
