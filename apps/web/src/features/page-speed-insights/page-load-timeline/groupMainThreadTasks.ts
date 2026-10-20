import type { CombinedLongTask } from "./collectTimelineSources";

/** Short tasks that start within this window of the previous short task join one row. */
export const SHORT_TASK_START_WINDOW_MS = 10;
/** Short tasks that begin this soon after the previous short task ends are contiguous. */
export const SHORT_TASK_CONTIGUOUS_GAP_MS = 1;
/** Chrome / Lighthouse long-task threshold. */
export const LONG_TASK_MS = 50;

export function isLongTask(task: CombinedLongTask): boolean {
  return task.duration >= LONG_TASK_MS;
}

/** Short tasks join when contiguous (end→start) or starts within the start window. */
function shortTasksAdjacent(prev: CombinedLongTask, next: CombinedLongTask): boolean {
  const startDelta = next.startTime - prev.startTime;
  const gap = next.startTime - (prev.startTime + prev.duration);
  return startDelta <= SHORT_TASK_START_WINDOW_MS || gap <= SHORT_TASK_CONTIGUOUS_GAP_MS;
}

/**
 * Long tasks always stand alone. Short tasks (&lt;50ms) collapse when adjacent.
 * A long task flushes any pending short group.
 */
export function groupMainThreadTasks(tasks: CombinedLongTask[]): CombinedLongTask[][] {
  const ordered = [...tasks].sort(
    (a, b) => a.startTime - b.startTime || b.duration - a.duration,
  );
  const groups: CombinedLongTask[][] = [];
  let shortGroup: CombinedLongTask[] = [];

  function flushShorts() {
    if (shortGroup.length) {
      groups.push(shortGroup);
      shortGroup = [];
    }
  }

  for (const task of ordered) {
    if (isLongTask(task)) {
      flushShorts();
      groups.push([task]);
      continue;
    }
    const prev = shortGroup[shortGroup.length - 1];
    if (prev && shortTasksAdjacent(prev, task)) {
      shortGroup.push(task);
    } else {
      flushShorts();
      shortGroup = [task];
    }
  }
  flushShorts();
  return groups;
}
