import type { PageLoadTimeline, ScreenshotFrame, TimelineMoment, TimelinePhase } from "./types";

/** Phase already underway at `timeMs` — latest start still at or before that time. */
function phaseActiveAt(phases: TimelinePhase[], timeMs: number): TimelinePhase | undefined {
  let active: TimelinePhase | undefined;
  for (const phase of phases) {
    if (phase.startMs <= timeMs) active = phase;
  }
  return active ?? phases[0];
}

function filmstripMoment(phases: TimelinePhase[], shot: ScreenshotFrame, index: number): TimelineMoment {
  const phase = phaseActiveAt(phases, shot.timing);
  return {
    id: `screenshot-${index}`,
    phaseId: phase?.id ?? "firstRender",
    phaseTitle: phase?.title ?? "First render",
    timeMs: shot.timing,
    title: "Screenshot",
    detail: "",
    status: "measured",
    hasTimestamp: true,
    kind: "marker",
    evidence: [],
    screenshot: { timing: shot.timing, data: shot.data },
    network: [],
    mainThread: [],
    findings: [],
  };
}

/**
 * Flatten phases into a single chronological list: 0ms first, later events further down.
 * Every filmstrip frame is its own row at the time it was captured.
 */
export function buildTimelineMoments(
  phases: TimelinePhase[],
  screenshots: PageLoadTimeline["screenshots"],
  lcpSegments: PageLoadTimeline["lcpSegments"],
  lcpElementLabel?: string,
): TimelineMoment[] {
  const flatSteps = phases.flatMap((phase, phaseIndex) =>
    phase.steps.map((step, stepIndex) => ({ phase, phaseIndex, step, stepIndex })),
  );

  const moments: TimelineMoment[] = [];
  for (const { phase, step } of flatSteps) {
    const timeMs = step.timeMs ?? phase.startMs;
    const isLcp = step.id === "sub-lcp";

    moments.push({
      id: step.id,
      phaseId: phase.id,
      phaseTitle: phase.title,
      timeMs,
      endMs: step.endMs,
      title: step.title,
      detail: step.detail,
      status: step.status,
      hasTimestamp: step.timeMs != null,
      kind: step.kind,
      rating: step.rating,
      evidence: step.evidence ?? [],
      table: step.table,
      waterfall: step.waterfall,
      notes: step.notes,
      network: [],
      mainThread: [],
      findings: [],
      lcpSegments: isLcp ? lcpSegments : undefined,
    });
  }

  screenshots.forEach((shot, index) => {
    moments.push(filmstripMoment(phases, shot, index));
  });

  moments.sort((a, b) => {
    if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
    if (a.phaseId !== b.phaseId) {
      const order = phases.map((p) => p.id);
      return order.indexOf(a.phaseId) - order.indexOf(b.phaseId);
    }
    return 0;
  });

  const seenPhase = new Set<string>();
  for (const moment of moments) {
    moment.isPhaseStart = !seenPhase.has(moment.phaseId);
    seenPhase.add(moment.phaseId);
  }

  if (lcpElementLabel) {
    const lcpMoment = moments.find((m) => m.id === "sub-lcp");
    if (lcpMoment && !lcpMoment.evidence.includes(lcpElementLabel)) {
      lcpMoment.evidence = [`Element: ${lcpElementLabel}`, ...lcpMoment.evidence];
    }
  }

  return moments;
}
