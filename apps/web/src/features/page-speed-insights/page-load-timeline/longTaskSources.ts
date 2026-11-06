import type { AuditResultsRecord, TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import type { TimelineClock } from "./simulatedThrottling";
import type { RawLongTask } from "./timelineSourceTypes";
import { auditItems } from "./auditReaders";

function taskRows(
  audits: AuditResultsRecord | undefined,
  id: string,
  includeUrl: boolean,
): RawLongTask[] {
  return auditItems(audits, id)
    .filter((item): item is TableItem => !!item && typeof item === "object")
    .map((item) => ({
      url: includeUrl && typeof item.url === "string" ? item.url : undefined,
      startTime: getNumber(item.startTime) ?? 0,
      duration: getNumber(item.duration) ?? 0,
    }))
    .filter((task) => task.duration > 0);
}

function mergeTasks(primary: RawLongTask[], extra: RawLongTask[]): RawLongTask[] {
  if (!primary.length) return extra;
  if (!extra.length) return primary;
  const seen = new Set(primary.map((task) => `${task.startTime}:${task.duration}`));
  return [...primary, ...extra.filter((task) => !seen.has(`${task.startTime}:${task.duration}`))];
}

function unmatchedObservedTasks(
  observed: RawLongTask[],
  attributed: RawLongTask[],
  cpu: number,
): RawLongTask[] {
  const pairs: { observedIndex: number; attributedIndex: number; delta: number }[] = [];
  observed.forEach((task, observedIndex) => {
    attributed.forEach((lantern, attributedIndex) => {
      const delta = Math.abs(task.duration * cpu - lantern.duration);
      const limit = Math.max(1, lantern.duration * 0.02);
      if (delta <= limit) pairs.push({ observedIndex, attributedIndex, delta });
    });
  });
  pairs.sort((a, b) => a.delta - b.delta || a.observedIndex - b.observedIndex);

  const usedObserved = new Set<number>();
  const usedAttributed = new Set<number>();
  for (const pair of pairs) {
    if (usedObserved.has(pair.observedIndex) || usedAttributed.has(pair.attributedIndex)) continue;
    usedObserved.add(pair.observedIndex);
    usedAttributed.add(pair.attributedIndex);
  }
  return observed.filter((_, index) => !usedObserved.has(index));
}

export function longTasks(
  audits: AuditResultsRecord | undefined,
  clock: TimelineClock | null,
): RawLongTask[] {
  const attributed = taskRows(audits, "long-tasks", true);
  const observed = taskRows(audits, "main-thread-tasks", false);
  if (!clock) return mergeTasks(attributed, observed);

  const cpu = clock.throttling.cpuSlowdownMultiplier;
  const extras = clock.adjustTasks(unmatchedObservedTasks(observed, attributed, cpu));
  return mergeTasks(attributed, extras);
}
