import type { CombinedLoad, CombinedRequest } from "./collectTimelineSources";
import { formatBytes, formatMs } from "@/features/page-speed-insights/shared/format";
import type { TimelineEvent } from "./types";
import type { PhaseBound } from "./timelinePhases";
import { event } from "./timelineEventFactory";
import { onCriticalPath, linkTransferMs, requestWaterfallBar } from "./networkTimelineEvents";

function formatSavingMs(label: string, ms: number | undefined): string | null {
  return ms != null && ms > 0 ? `${label} −${formatMs(ms)}` : null;
}

/** Splits requests into what gates the first paints and what merely shares bandwidth. */
export function criticalPathEvents(load: CombinedLoad, bounds: PhaseBound[]): TimelineEvent[] {
  const sized = load.requests.filter((r) => r.networkEndTime > r.networkRequestTime);
  const critical = sized.filter(onCriticalPath);
  const paintMs = load.lcp ?? load.fcp;
  const rest = sized.filter((r) => !onCriticalPath(r));
  if (!critical.length && !rest.length) return [];

  const timeMs = load.fcp ?? load.dcl ?? 0;
  const events: TimelineEvent[] = [];
  const bytesOf = (rs: CombinedRequest[]) => rs.reduce((sum, r) => sum + (r.transferSize ?? 0), 0);

  if (critical.length) {
    const doneMs = Math.max(...critical.map((r) => r.networkEndTime));
    const gains = (load.savings ?? [])
      .filter((s) => (s.fcpMs ?? 0) > 0 || (s.lcpMs ?? 0) > 0)
      .map((s) =>
        [
          s.title,
          [formatSavingMs("FCP", s.fcpMs), formatSavingMs("LCP", s.lcpMs)]
            .filter(Boolean)
            .join(", "),
        ].join(": "),
      );
    events.push(
      event(
        {
          id: "critical-path",
          title: "Critical path",
          detail: `${critical.length} render-blocking or critical-chain requests (${formatBytes(bytesOf(critical))}) finish by ${formatMs(doneMs)}${paintMs != null && doneMs > paintMs ? `, some after the first paint at ${formatMs(paintMs)}` : ""}. Speeding up the blocking ones is what moves FCP and LCP.`,
          timeMs,
          phaseId: "subresources",
          kind: "blocking",
          hasTimestamp: false,
          evidence: gains,
          waterfall: critical.map((r, i) =>
            requestWaterfallBar(r, `critical-${i}`, {
              renderBlocking: r.renderBlocking,
              criticalPath: true,
              priority: r.priority,
            }),
          ),
        },
        bounds,
      ),
    );
  }

  if (rest.length) {
    const afterPaint = paintMs != null ? rest.filter((r) => r.networkEndTime > paintMs) : rest;
    const idle = (load.savings ?? [])
      .filter((s) => (s.bytes ?? 0) > 0 && !(s.fcpMs ?? 0) && !(s.lcpMs ?? 0))
      .map(
        (s) =>
          `${s.title}: ${formatBytes(s.bytes ?? 0)} to save, but 0 ms on FCP/LCP (not on the critical path)`,
      );
    events.push(
      event(
        {
          id: "off-critical-path",
          title: "Off the critical path",
          detail: `${rest.length} other requests (${formatBytes(bytesOf(rest))}); ${afterPaint.length} finish after the page has painted. They don't delay FCP or LCP but compete for bandwidth with later work.`,
          timeMs,
          phaseId: "subresources",
          kind: "fact",
          hasTimestamp: false,
          evidence: idle,
        },
        bounds,
      ),
    );
  }
  return events;
}

export function transferWeightEvent(
  load: CombinedLoad,
  bounds: PhaseBound[],
): TimelineEvent | null {
  const kbps = load.simulatedThroughputKbps;
  if (!kbps) return null;
  const sized = load.requests.filter((r) => (r.transferSize ?? 0) > 0);
  const totalBytes = sized.reduce((sum, r) => sum + (r.transferSize ?? 0), 0);
  const fullMs = linkTransferMs(totalBytes, kbps);
  const traceEnd = load.traceEnd ?? load.load ?? 0;
  if (totalBytes === 0 || fullMs < Math.max(traceEnd * 1.5, 5000)) return null;

  const largest = [...sized]
    .sort((a, b) => (b.transferSize ?? 0) - (a.transferSize ?? 0))
    .slice(0, 3);
  const largestBytes = largest.reduce((sum, r) => sum + (r.transferSize ?? 0), 0);
  const timeMs = load.fcp ?? load.dcl ?? 0;
  return event(
    {
      id: "net-weight",
      title: "Transfer weight",
      detail: `${formatBytes(totalBytes)} transferred; about ${formatMs(fullMs)} of pure transfer at ${load.simulationLabel ?? "the throttled link"}, versus ${formatMs(traceEnd)} on this timeline. The ${largest.length} largest requests are ${formatBytes(largestBytes)}.`,
      timeMs,
      phaseId: "subresources",
      kind: "fact",
      hasTimestamp: false,
      rating: "poor",
      evidence: largest.map((r) => `${formatBytes(r.transferSize ?? 0)} ${r.url}`),
    },
    bounds,
  );
}
