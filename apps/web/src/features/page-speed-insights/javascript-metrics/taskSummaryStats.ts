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

export function computeTaskSummaryStats(metrics: TaskSummaryData[]): TaskSummaryStats[] {
  return metrics.map(({ label, diagnostics, mainThreadTasks }) => {
    const diagnosticsItem = diagnostics[0] || {};
    const totalTasks =
      typeof diagnosticsItem.numTasks === "number"
        ? diagnosticsItem.numTasks
        : mainThreadTasks.length;
    const totalTaskTime =
      typeof diagnosticsItem.totalTaskTime === "number"
        ? diagnosticsItem.totalTaskTime
        : mainThreadTasks.reduce((sum, task) => {
            const duration = typeof task.duration === "number" ? task.duration : 0;
            return sum + duration;
          }, 0);

    const numTasksOver10ms =
      typeof diagnosticsItem.numTasksOver10ms === "number" ? diagnosticsItem.numTasksOver10ms : 0;
    const numTasksOver25ms =
      typeof diagnosticsItem.numTasksOver25ms === "number" ? diagnosticsItem.numTasksOver25ms : 0;
    const numTasksOver50ms =
      typeof diagnosticsItem.numTasksOver50ms === "number" ? diagnosticsItem.numTasksOver50ms : 0;
    const numTasksOver100ms =
      typeof diagnosticsItem.numTasksOver100ms === "number" ? diagnosticsItem.numTasksOver100ms : 0;
    const numTasksOver500ms =
      typeof diagnosticsItem.numTasksOver500ms === "number" ? diagnosticsItem.numTasksOver500ms : 0;

    const taskDurations = mainThreadTasks
      .map((task) => (typeof task.duration === "number" ? task.duration : 0))
      .filter((d) => d > 0);

    const averageTaskDuration =
      taskDurations.length > 0
        ? taskDurations.reduce((sum, d) => sum + d, 0) / taskDurations.length
        : totalTasks > 0
          ? totalTaskTime / totalTasks
          : 0;

    const longestTaskDuration = taskDurations.length > 0 ? Math.max(...taskDurations) : 0;

    return {
      label,
      totalTasks,
      totalTaskTime,
      numTasksOver10ms,
      numTasksOver25ms,
      numTasksOver50ms,
      numTasksOver100ms,
      numTasksOver500ms,
      averageTaskDuration,
      longestTaskDuration,
    };
  });
}
