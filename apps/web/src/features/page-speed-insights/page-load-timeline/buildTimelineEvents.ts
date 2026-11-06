import type { CombinedLoad } from "./collectTimelineSources";
import type { TimelineEvent } from "./types";
import { PHASE_ORDER, phaseBounds } from "./timelinePhases";
import { networkEvents } from "./networkTimelineEvents";
import { longTaskEvents } from "./longTaskTimelineEvents";
import { layoutShiftEvents, screenshotEvents, userTimingEvents } from "./markerTimelineEvents";
import { milestoneEvents } from "./milestoneTimelineEvents";
import { withPhaseStarts } from "./withPhaseStarts";

/** Turn a combined load into a single chronological event list. */
export function buildTimelineEvents(load: CombinedLoad): TimelineEvent[] {
  const bounds = phaseBounds(load);
  const events = [
    ...milestoneEvents(load, bounds),
    ...networkEvents(load, bounds),
    ...longTaskEvents(load, bounds),
    ...userTimingEvents(load.userTimings, bounds),
    ...layoutShiftEvents(load.layoutShifts, bounds),
    ...screenshotEvents(load, bounds),
  ];

  events.sort((a, b) => {
    if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
    if (a.phaseId !== b.phaseId) {
      return PHASE_ORDER.indexOf(a.phaseId) - PHASE_ORDER.indexOf(b.phaseId);
    }
    return 0;
  });

  return withPhaseStarts(events);
}

export function axisEndMs(load: CombinedLoad, events: TimelineEvent[]): number {
  // Under simulation a big download can run for minutes, which would squash the
  // paint milestones into the first pixels. Its bar clips at the axis end instead.
  const requestsShapeAxis = !load.simulationLabel;
  return Math.max(
    load.lcp ?? 0,
    load.load ?? 0,
    load.lastVisual ?? 0,
    load.fcp ?? 0,
    load.interactive ?? 0,
    load.traceEnd ?? 0,
    ...(requestsShapeAxis ? load.requests.map((r) => r.networkEndTime) : []),
    ...(requestsShapeAxis ? load.redirectHops.map((r) => r.networkEndTime) : []),
    ...load.longTasks.map((t) => t.startTime + t.duration),
    ...load.screenshots.map((shot) => shot.timing),
    ...load.userTimings.map((t) => t.startTime + (t.duration ?? 0)),
    ...load.layoutShifts.map((shift) => shift.startTime),
    ...events
      .filter(
        (e) => requestsShapeAxis || !/^(net|nav-redirects)/.test(e.id) || e.id === "net-weight",
      )
      .map((e) => e.endMs ?? e.timeMs),
    1,
  );
}
