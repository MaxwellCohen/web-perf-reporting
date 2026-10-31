import type { TimelineEvent } from "./types";

export type MomentInterval = {
  startMs: number;
  endMs: number;
};

/** Wall-clock range for a moment. Point markers use `[timeMs, timeMs]`. */
export function momentInterval(event: TimelineEvent): MomentInterval {
  const startMs = event.startMs ?? event.timeMs;
  const endMs = event.endMs ?? event.timeMs;
  return { startMs, endMs };
}

export function isIntervalMoment(event: TimelineEvent): boolean {
  const { startMs, endMs } = momentInterval(event);
  return endMs > startMs;
}
