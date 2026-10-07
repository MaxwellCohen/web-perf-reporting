import type { AuditResult, TableItem } from "@/lib/schema";

/** Chrome treats a main-thread task longer than this as a long task. */
export const LONG_TASK_THRESHOLD_MS = 50;

/** How many longest tasks to list before summarizing the rest. */
const LONG_TASKS_SHOWN = 8;

type MainThreadTaskRow = {
  startTime: number;
  duration: number;
  blockingTime: number;
};

/** Blocking time rolled up by the script Lighthouse attributed to each long task. */
export type ScriptBlockingRow = {
  url: string;
  taskCount: number;
  blockingTimeMs: number;
};

export type MainThreadTaskSummary = {
  totalTasks: number;
  totalTimeMs: number;
  longestDurationMs: number;
  longTaskCount: number;
  blockingTimeMs: number;
  longestTasks: MainThreadTaskRow[];
  omittedLongTaskCount: number;
};

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function taskItemsFromAudit(audit: AuditResult): TableItem[] {
  const details = audit.details;
  if (!details || !("items" in details) || !Array.isArray(details.items)) {
    return [];
  }
  return details.items;
}

/**
 * Summarize toplevel main-thread tasks.
 * Blocking time is duration past 50 ms, the portion that can add to Total Blocking Time.
 */
export function summarizeMainThreadTasks(
  items: readonly { startTime?: unknown; duration?: unknown }[],
  limit = LONG_TASKS_SHOWN,
): MainThreadTaskSummary {
  const tasks: MainThreadTaskRow[] = [];
  let totalTimeMs = 0;

  for (const item of items) {
    const duration = asNumber(item.duration);
    if (duration === null || duration < 0) continue;
    const startTime = asNumber(item.startTime) ?? 0;
    totalTimeMs += duration;
    tasks.push({
      startTime,
      duration,
      blockingTime: Math.max(0, duration - LONG_TASK_THRESHOLD_MS),
    });
  }

  const longTasks = tasks
    .filter((task) => task.duration > LONG_TASK_THRESHOLD_MS)
    .sort((a, b) => b.duration - a.duration || a.startTime - b.startTime);

  const shown = longTasks.slice(0, Math.max(0, limit));

  return {
    totalTasks: tasks.length,
    totalTimeMs,
    longestDurationMs: tasks.reduce((max, task) => Math.max(max, task.duration), 0),
    longTaskCount: longTasks.length,
    blockingTimeMs: longTasks.reduce((sum, task) => sum + task.blockingTime, 0),
    longestTasks: shown,
    omittedLongTaskCount: Math.max(0, longTasks.length - shown.length),
  };
}

function scriptUrlFromDebugTask(
  task: { urlIndex?: unknown },
  urls: readonly unknown[],
): string | undefined {
  const urlIndex = asNumber(task.urlIndex);
  if (urlIndex === null || urlIndex < 0 || urlIndex >= urls.length) return undefined;
  const url = urls[urlIndex];
  return typeof url === "string" && url ? url : undefined;
}

/**
 * Long-task rows with a script URL.
 * Prefers table items. Falls back to debugData urlIndex entries when items have no URL.
 */
export function longTaskItemsFromAudit(
  audit: AuditResult | undefined,
): Array<{ url?: unknown; duration?: unknown }> {
  if (!audit) return [];

  const items = taskItemsFromAudit(audit);
  if (items.some((item) => typeof item.url === "string" && item.url)) {
    return items;
  }

  const details = audit.details;
  const debug =
    details && "debugData" in details
      ? (details.debugData as { urls?: unknown; tasks?: unknown })
      : undefined;
  if (!debug || !Array.isArray(debug.urls) || !Array.isArray(debug.tasks)) {
    return [];
  }

  return debug.tasks.flatMap((task) => {
    if (!task || typeof task !== "object") return [];
    const record = task as { urlIndex?: unknown; duration?: unknown };
    return [{ url: scriptUrlFromDebugTask(record, debug.urls as unknown[]), duration: record.duration }];
  });
}

/**
 * Group long tasks by script URL.
 * Lighthouse attributes a task to the script that was running, or "Unattributable".
 */
export function summarizeLongTaskScripts(
  items: readonly { url?: unknown; duration?: unknown }[],
): ScriptBlockingRow[] {
  const byUrl = new Map<string, ScriptBlockingRow>();

  for (const item of items) {
    if (typeof item.url !== "string" || !item.url) continue;
    const duration = asNumber(item.duration);
    if (duration === null || duration < 0) continue;

    const blockingTime = Math.max(0, duration - LONG_TASK_THRESHOLD_MS);
    const existing = byUrl.get(item.url);
    if (existing) {
      existing.taskCount += 1;
      existing.blockingTimeMs += blockingTime;
    } else {
      byUrl.set(item.url, {
        url: item.url,
        taskCount: 1,
        blockingTimeMs: blockingTime,
      });
    }
  }

  return [...byUrl.values()].sort(
    (a, b) => b.blockingTimeMs - a.blockingTimeMs || b.taskCount - a.taskCount || a.url.localeCompare(b.url),
  );
}

export function formatTaskMs(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  const rounded = Math.round(ms);
  if (Math.abs(rounded) < 1000) return `${rounded} ms`;
  return `${(rounded / 1000).toFixed(2)} s`;
}
