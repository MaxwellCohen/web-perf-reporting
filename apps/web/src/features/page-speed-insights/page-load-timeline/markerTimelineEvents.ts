import type {
  CombinedLoad,
  LayoutShiftEvent,
  PreconnectCandidate,
  UserTiming,
} from "./collectTimelineSources";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import type { TimelineEvent } from "./types";
import { type PhaseBound, phaseActiveAt } from "./timelinePhases";
import { atIntervalEnd, event } from "./timelineEventFactory";

function formatClsScore(score: number): string {
  if (!Number.isFinite(score)) return "—";
  if (score === 0) return "0";
  if (Math.abs(score) < 0.001) return score.toPrecision(2);
  return score.toFixed(3);
}

export function userTimingEvents(timings: UserTiming[], bounds: PhaseBound[]): TimelineEvent[] {
  return timings.map((timing, index) => {
    const isMeasure = timing.timingType.toLowerCase() === "measure" && timing.duration != null;
    const placement = isMeasure
      ? atIntervalEnd(timing.startTime, timing.startTime + timing.duration!)
      : { timeMs: timing.startTime };
    const detail = isMeasure
      ? `User timing measure lasting ${formatMs(timing.duration!)}.`
      : "User timing mark.";
    const phase = phaseActiveAt(bounds, placement.timeMs);
    return event(
      {
        id: `user-timing-${index}`,
        title: timing.name,
        detail,
        ...placement,
        phaseId: phase.id,
        kind: "marker",
      },
      bounds,
    );
  });
}

export function preconnectEvent(
  preconnectedText: string | undefined,
  candidates: PreconnectCandidate[],
  bounds: PhaseBound[],
): TimelineEvent | null {
  if (!candidates.length) return null;

  const maxSavings = Math.max(...candidates.map((c) => c.wastedMs));
  const lines = [
    preconnectedText ? `${preconnectedText.replace(/\.$/, "")}.` : null,
    `${candidates.length} origin${candidates.length === 1 ? "" : "s"} could save an estimated ${formatMs(
      maxSavings,
    )} on LCP with preconnect.`,
  ].filter(Boolean);

  return event(
    {
      id: "conn-preconnect",
      title: "Preconnect",
      detail: lines.join(" "),
      timeMs: bounds.find((b) => b.id === "connection")?.startMs ?? 0,
      phaseId: "connection",
      kind: "fact",
      hasTimestamp: false,
      evidence: candidates.map((c) => `${c.origin} (~${formatMs(c.wastedMs)} est. LCP savings)`),
      table: {
        headers: [{ text: "Origin" }, { text: "Est. LCP savings", align: "end" }],
        rows: candidates.map((c) => [
          { text: c.origin },
          { text: formatMs(c.wastedMs), align: "end" as const },
        ]),
      },
    },
    bounds,
  );
}

export function screenshotEvents(load: CombinedLoad, bounds: PhaseBound[]): TimelineEvent[] {
  return load.screenshots.map((shot, index) => {
    const phase = phaseActiveAt(bounds, shot.timing);
    return event(
      {
        id: `screenshot-${index}`,
        title: "Screenshot",
        detail: "",
        timeMs: shot.timing,
        phaseId: phase.id,
        kind: "marker",
        screenshot: { timing: shot.timing, data: shot.data },
      },
      bounds,
    );
  });
}

export function layoutShiftEvents(
  shifts: LayoutShiftEvent[],
  bounds: PhaseBound[],
): TimelineEvent[] {
  return shifts.map((shift, index) => {
    const phase = phaseActiveAt(bounds, shift.startTime);
    const scoreText = formatClsScore(shift.score);
    return event(
      {
        id: `layout-shift-${index}`,
        title: "Layout shift",
        detail: [
          `Layout shift score ${scoreText} at ${formatMs(shift.startTime)}.`,
          shift.nodeLabel ? `Largest impacted element: ${shift.nodeLabel}.` : null,
        ]
          .filter(Boolean)
          .join(" "),
        timeMs: shift.startTime,
        phaseId: phase.id,
        kind: "marker",
        rating: shift.score <= 0.1 ? "good" : shift.score <= 0.25 ? "needs-improvement" : "poor",
        evidence: shift.nodeLabel ? [`Element: ${shift.nodeLabel}`] : [],
      },
      bounds,
    );
  });
}
