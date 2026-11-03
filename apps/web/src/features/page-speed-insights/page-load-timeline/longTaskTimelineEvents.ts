import type { CombinedLoad, CombinedLongTask } from "./collectTimelineSources";
import { groupMainThreadTasks, isLongTask } from "./groupMainThreadTasks";
import {
  formatBytes,
  formatCoverage,
  formatMs,
  shortUrl,
} from "@/features/page-speed-insights/shared/format";
import type { TimelineEvent, TimelineWaterfallBar } from "./types";
import { type PhaseBound, phaseActiveAt } from "./timelinePhases";
import { atIntervalEnd, event } from "./timelineEventFactory";

function longTaskBar(task: CombinedLongTask, id: string): TimelineWaterfallBar {
  const bar: TimelineWaterfallBar = {
    id,
    label: task.url ? shortUrl(task.url) : "Unattributed",
    href: task.url,
    startMs: task.startTime,
    endMs: task.startTime + task.duration,
    resourceType: "Task",
    taskKind: isLongTask(task) ? "long" : "short",
  };
  if (!task.url) return bar;

  if (task.scriptTransferBytes != null) bar.scriptSize = formatBytes(task.scriptTransferBytes);
  if (task.downloadStartMs != null && task.downloadEndMs != null) {
    bar.downloadStartMs = task.downloadStartMs;
    bar.downloadEndMs = task.downloadEndMs;
    bar.downloadDuration = formatMs(Math.max(0, task.downloadEndMs - task.downloadStartMs));
  }
  if (task.coverage) bar.coverage = formatCoverage(task.coverage);
  if (task.scriptCpu) bar.scriptCpu = task.scriptCpu;
  if (task.chain) bar.chain = task.chain;
  return bar;
}

function taskGroupDetail(group: CombinedLongTask[], long: boolean): string {
  if (group.length === 1) {
    const task = group[0]!;
    if (long) {
      return task.url
        ? `${shortUrl(task.url)} blocked the main thread for ${formatMs(task.duration)}.`
        : `Unattributed script blocked the main thread for ${formatMs(task.duration)}.`;
    }
    return task.url
      ? `${shortUrl(task.url)} ran on the main thread for ${formatMs(task.duration)}.`
      : `Main thread task lasting ${formatMs(task.duration)}.`;
  }
  const totalDuration = group.reduce((sum, t) => sum + t.duration, 0);
  return `${group.length} short tasks (${formatMs(totalDuration)} total).`;
}

export function longTaskEvents(load: CombinedLoad, bounds: PhaseBound[]): TimelineEvent[] {
  if (!load.longTasks.length) return [];

  const groups = groupMainThreadTasks(load.longTasks);
  let longIndex = 0;
  let shortIndex = 0;

  return groups.map((group) => {
    const long = group.some(isLongTask);
    const index = long ? longIndex++ : shortIndex++;
    const idPrefix = long ? "long-task" : "short-task";
    const startMs = Math.min(...group.map((t) => t.startTime));
    const endMs = Math.max(...group.map((t) => t.startTime + t.duration));
    const placement = atIntervalEnd(startMs, endMs);
    const phase = phaseActiveAt(bounds, placement.timeMs);

    return event(
      {
        id: `${idPrefix}-${index}`,
        title: long
          ? "Long task"
          : group.length === 1
            ? "Short task"
            : `${group.length} Short tasks`,
        detail: taskGroupDetail(group, long),
        ...placement,
        phaseId: phase.id,
        kind: long ? "blocking" : "potentially-blocking",
        waterfall: group.map((task, i) => longTaskBar(task, `${idPrefix}-${index}-${i}`)),
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
      bounds,
    );
  });
}
