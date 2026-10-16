import { frameAtFcp } from "@/features/page-speed-insights/fcpScreenshot";
import type { PageLoadTimeline, TimelineMoment, TimelinePhase } from "./types";

const SCREENSHOT_STEP_IDS = new Set([
  "render-fcp",
  "sub-lcp",
  "sub-load",
  "sub-last-visual",
]);

/**
 * Flatten phases into a single chronological list: 0ms first, later events further down.
 * Screenshots attach only to paint milestones (FCP, LCP, load, last visual).
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
    const shot =
      screenshots.length &&
      step.timeMs != null &&
      SCREENSHOT_STEP_IDS.has(step.id)
        ? frameAtFcp(screenshots, step.timeMs)
        : undefined;

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
      screenshot: shot ? { timing: shot.timing, data: shot.data } : undefined,
      network: [],
      mainThread: [],
      findings: [],
      lcpSegments: isLcp ? lcpSegments : undefined,
    });
  }

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
