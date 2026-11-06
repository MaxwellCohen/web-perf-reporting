import type { PhaseId, TimelineEvent } from "./types";
import { type PhaseBound, phaseActiveAt } from "./timelinePhases";

export function event(
  partial: Omit<TimelineEvent, "evidence" | "status" | "hasTimestamp" | "phaseTitle"> & {
    evidence?: string[];
    status?: TimelineEvent["status"];
    hasTimestamp?: boolean;
    phaseTitle?: string;
  },
  bounds: PhaseBound[],
): TimelineEvent {
  const phase =
    bounds.find((b) => b.id === partial.phaseId) ?? phaseActiveAt(bounds, partial.timeMs);
  return {
    evidence: [],
    status: "measured",
    hasTimestamp: partial.timeMs != null,
    ...partial,
    phaseId: partial.phaseId ?? phase.id,
    phaseTitle: partial.phaseTitle ?? phase.title,
  };
}

export function timedEvent(
  id: string,
  title: string,
  detail: string,
  timeMs: number,
  phaseId: PhaseId,
  bounds: PhaseBound[],
  extras: Partial<TimelineEvent> = {},
): TimelineEvent {
  return event(
    {
      id,
      title,
      detail,
      timeMs,
      phaseId,
      kind: "marker",
      ...extras,
    },
    bounds,
  );
}

/** Place an interval at its end; start shows as smaller text above the node. */
export function atIntervalEnd(
  startMs: number,
  endMs: number,
): Pick<TimelineEvent, "timeMs" | "startMs" | "endMs"> {
  return { startMs, timeMs: endMs, endMs };
}
