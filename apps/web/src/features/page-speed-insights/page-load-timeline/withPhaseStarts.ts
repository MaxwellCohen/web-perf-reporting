import type { TimelineEvent } from "./types";

/** Flag the first event of each phase; returns the same event object when its flag is already right. */
export function withPhaseStarts(events: TimelineEvent[]): TimelineEvent[] {
  const seen = new Set<string>();
  return events.map((moment) => {
    const isPhaseStart = !seen.has(moment.phaseId);
    seen.add(moment.phaseId);
    if (moment.isPhaseStart === isPhaseStart) return moment;
    return { ...moment, isPhaseStart };
  });
}
