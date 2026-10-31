import type { TimelineEvent, TimelineWaterfallBar } from "./types";

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

function allTaskFilters(): TaskFilterSelection {
  return new Set(TASK_FILTERS);
}

/**
 * Enables every task filter when the query param is absent, and drops unknown
 * filter ids otherwise.
 */
export function resolveTaskFilterSelection(
  tasks: readonly string[] | null | undefined,
): TaskFilterSelection {
  if (tasks == null) return allTaskFilters();
  const allowed = new Set<string>(TASK_FILTERS);
  return new Set(tasks.filter((id): id is TaskFilterId => allowed.has(id)));
}

/** Filters that have something to hide on this timeline. */
export function availableTaskFilters(events: TimelineEvent[]): TaskFilterId[] {
  const present = new Set<TaskFilterId>();
  for (const moment of events) {
    if (moment.id.startsWith("long-task-")) present.add("long-task");
    if (moment.id.startsWith("short-task-")) present.add("potentially-blocking");
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

/** The root document stays visible with the navigation. */
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
  moment: TimelineEvent,
  enabled: TaskFilterSelection,
): TimelineEvent | null {
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

function filterMoment(moment: TimelineEvent, enabled: TaskFilterSelection): TimelineEvent | null {
  if (moment.id.startsWith("long-task-")) {
    return enabled.has("long-task") ? moment : null;
  }
  if (moment.id.startsWith("short-task-")) {
    return enabled.has("potentially-blocking") ? moment : null;
  }
  return filterDownloadMoment(moment, enabled);
}

function withPhaseStarts(events: TimelineEvent[]): TimelineEvent[] {
  const seen = new Set<string>();
  return events.map((moment) => {
    const isPhaseStart = !seen.has(moment.phaseId);
    seen.add(moment.phaseId);
    if (moment.isPhaseStart === isPhaseStart) return moment;
    return { ...moment, isPhaseStart };
  });
}

export function filterTimelineMoments(
  events: TimelineEvent[],
  enabled: TaskFilterSelection,
): TimelineEvent[] {
  if (allEnabled(enabled)) return events;

  const visible: TimelineEvent[] = [];
  for (const moment of events) {
    const next = filterMoment(moment, enabled);
    if (next) visible.push(next);
  }
  return withPhaseStarts(visible);
}
