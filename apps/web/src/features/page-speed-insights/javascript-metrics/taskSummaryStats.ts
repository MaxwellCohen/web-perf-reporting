import type { TableItem } from "@/lib/schema";

export type TaskSummaryData = {
  label: string;
  diagnostics: TableItem[];
  mainThreadTasks: TableItem[];
};

export type TaskSummaryStats = {
  label: string;
  totalTasks: number;
  totalTaskTime: number;
  numTasksOver10ms: number;
  numTasksOver25ms: number;
  numTasksOver50ms: number;
  numTasksOver100ms: number;
  numTasksOver500ms: number;
  averageTaskDuration: number;
  longestTaskDuration: number;
};

const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/**
 * The `main-thread-tasks` audit only lists toplevel tasks longer than 5 ms, while `diagnostics`
 * counts every toplevel task. So the threshold counts (all >= 10 ms) and the longest task come
 * from the task list when present, and the totals (task count, time, average) come from
 * diagnostics when present, so the average always equals total time / total tasks.
 */
export function computeTaskSummaryStats(metrics: TaskSummaryData[]): TaskSummaryStats[] {
  return metrics.map(({ label, diagnostics, mainThreadTasks }) => {
    const diag = diagnostics[0] || {};
    const durations = mainThreadTasks
      .map((task) => num(task.duration))
      .filter((d): d is number => d !== undefined && d >= 0);
    const hasList = durations.length > 0;

    const listTime = durations.reduce((sum, d) => sum + d, 0);
    const totalTasks = num(diag.numTasks) ?? durations.length;
    const totalTaskTime = num(diag.totalTaskTime) ?? listTime;

    const over = (ms: number, key: string) =>
      hasList ? durations.filter((d) => d > ms).length : (num(diag[key]) ?? 0);

    return {
      label,
      totalTasks,
      totalTaskTime,
      numTasksOver10ms: over(10, "numTasksOver10ms"),
      numTasksOver25ms: over(25, "numTasksOver25ms"),
      numTasksOver50ms: over(50, "numTasksOver50ms"),
      numTasksOver100ms: over(100, "numTasksOver100ms"),
      numTasksOver500ms: over(500, "numTasksOver500ms"),
      averageTaskDuration: totalTasks > 0 ? totalTaskTime / totalTasks : 0,
      longestTaskDuration: hasList ? Math.max(...durations) : 0,
    };
  });
}
