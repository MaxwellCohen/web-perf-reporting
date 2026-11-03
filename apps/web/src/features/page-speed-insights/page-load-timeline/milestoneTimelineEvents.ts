import type { CombinedLoad, CombinedRequest } from "./collectTimelineSources";
import { formatBytes, formatMs, shortUrl } from "@/features/page-speed-insights/shared/format";
import type {
  PhaseId,
  TimelineEvent,
  TimelineNote,
  TimelineTable,
  TimelineWaterfallBar,
} from "./types";
import type { PhaseBound } from "./timelinePhases";
import { requestWaterfallBar } from "./networkTimelineEvents";
import { atIntervalEnd, timedEvent } from "./timelineEventFactory";
import { preconnectEvent } from "./markerTimelineEvents";

function ttfbStepDetail(
  timeMs: number,
  observed: boolean,
  simulated: number | undefined,
  simulationLabel?: string,
): string {
  if (simulationLabel) {
    return `First byte at ${formatMs(timeMs)} under simulated ${simulationLabel}.`;
  }
  if (!observed) return `First byte at ${formatMs(timeMs)}.`;
  const base = `Observed first byte at ${formatMs(timeMs)}.`;
  if (simulated != null && simulated > timeMs * 1.5) {
    return `${base} The lab score (${formatMs(simulated)}) includes simulated throttling and is not on this trace.`;
  }
  return base;
}

function redirectWaterfall(hops: CombinedRequest[]): {
  waterfall: TimelineWaterfallBar[];
  table: TimelineTable;
} {
  return {
    waterfall: hops.map((hop, index) =>
      requestWaterfallBar(hop, `nav-redirects-${index}`, { resourceType: "Redirect" }),
    ),
    table: {
      headers: [
        { text: "URL" },
        { text: "Start", align: "end" },
        { text: "Duration", align: "end" },
        { text: "Status", align: "end" },
        { text: "Size", align: "end" },
        { text: "Protocol", align: "end" },
      ],
      rows: hops.map((hop) => [
        { text: shortUrl(hop.url), href: hop.url },
        { text: formatMs(hop.networkRequestTime), align: "end" as const },
        {
          text: formatMs(hop.networkEndTime - hop.networkRequestTime),
          align: "end" as const,
        },
        {
          text: hop.statusCode != null ? `status ${hop.statusCode}` : "",
          align: "end" as const,
        },
        {
          text: hop.transferSize != null ? formatBytes(hop.transferSize) : "",
          align: "end" as const,
        },
        { text: hop.protocol ?? "", align: "end" as const },
      ]),
    },
  };
}

function serverThinkEvent(load: CombinedLoad, bounds: PhaseBound[]): TimelineEvent | null {
  if (load.serverThinkMs == null || load.serverStartMs == null || load.serverEndMs == null) {
    return null;
  }
  const placement =
    load.serverEndMs !== load.serverStartMs
      ? atIntervalEnd(load.serverStartMs, load.serverEndMs)
      : { timeMs: load.serverStartMs };
  return timedEvent(
    "req-server",
    "Server think time",
    `Root document server response took ${formatMs(load.serverThinkMs)}.`,
    placement.timeMs,
    "requestResponse",
    bounds,
    { ...placement, kind: "marker" },
  );
}

export function milestoneEvents(load: CombinedLoad, bounds: PhaseBound[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const mark = (
    time: number | undefined,
    id: string,
    title: string,
    detailPrefix: string,
    phaseId: PhaseId,
    extras?: Partial<TimelineEvent>,
  ) => {
    if (time != null) {
      events.push(
        timedEvent(id, title, `${detailPrefix} ${formatMs(time)}.`, time, phaseId, bounds, extras),
      );
    }
  };

  events.push(
    timedEvent(
      "nav-start",
      "Navigation start",
      "Lab navigation begins. performance.timeOrigin is set.",
      0,
      "navigation",
      bounds,
    ),
  );

  const hops = load.redirectHops;
  const redirectStart = hops.length
    ? Math.min(...hops.map((hop) => hop.networkRequestTime))
    : load.redirectAuditMs != null && load.redirectAuditMs > 0
      ? 0
      : undefined;
  const redirectEnd = hops.length
    ? Math.max(...hops.map((hop) => hop.networkEndTime))
    : load.redirectAuditMs != null && load.redirectAuditMs > 0
      ? load.redirectAuditMs
      : undefined;

  if (redirectStart != null && redirectEnd != null && redirectEnd > redirectStart) {
    const redirectMs = redirectEnd - redirectStart;
    const placement = atIntervalEnd(redirectStart, redirectEnd);
    events.push(
      timedEvent(
        "nav-redirects",
        "Redirects",
        `${formatMs(redirectMs)} spent on redirects before the document.`,
        placement.timeMs,
        "navigation",
        bounds,
        {
          ...placement,
          kind: "blocking",
          rating: redirectMs > 100 ? "needs-improvement" : "good",
          evidence: hops.length ? hops.map((hop) => hop.url) : load.redirectAuditUrls,
          ...(hops.length ? redirectWaterfall(hops) : {}),
        },
      ),
    );
  }

  const serverThink = serverThinkEvent(load, bounds);
  if (serverThink) events.push(serverThink);

  if (load.ttfb != null) {
    events.push(
      timedEvent(
        "req-ttfb",
        "TTFB",
        ttfbStepDetail(load.ttfb, load.ttfbObserved, load.simulatedTtfb, load.simulationLabel),
        load.ttfb,
        "requestResponse",
        bounds,
        { kind: "marker", rating: load.ttfbRating },
      ),
    );
  }

  mark(
    load.firstVisual,
    "render-first-visual",
    "First visual change",
    "First visual change at",
    "firstRender",
  );

  mark(load.firstPaint, "render-fp", "First Paint", "First Paint at", "firstRender");

  mark(load.fcp, "render-fcp", "FCP", "First Contentful Paint at", "firstRender", {
    kind: "cwv",
    rating: load.fcpRating,
  });

  if (load.lcp != null && load.lcpSegments.length) {
    for (const seg of load.lcpSegments) {
      if (seg.subpart === "elementRenderDelay") continue;
      if (seg.durationMs < 100) continue;
      if (load.fcp != null && seg.endMs <= load.fcp) continue;
      const startMs = load.fcp != null ? Math.max(load.fcp, seg.startMs) : seg.startMs;
      if (startMs >= load.lcp) continue;
      const placement = atIntervalEnd(startMs, Math.min(load.lcp, seg.endMs));
      events.push(
        timedEvent(
          `lcp-seg-${seg.subpart}`,
          seg.label,
          `${formatMs(seg.durationMs)} of LCP is ${seg.label.toLowerCase()}.`,
          placement.timeMs,
          "firstRender",
          bounds,
          placement,
        ),
      );
    }
  }

  mark(load.dcl, "parse-dcl", "DOMContentLoaded", "DOMContentLoaded at", "parsingComplete");

  if (load.lcp != null) {
    const largest = [...load.lcpSegments].sort((a, b) => b.durationMs - a.durationMs)[0];
    const discoveryNotes: TimelineNote[] = load.lcpDiscoveryFailures.map((failure) => ({
      id: `lcp-discovery-${failure.id}`,
      title: "LCP discovery",
      detail: failure.label,
      status: "measured" as const,
      kind: "blocking" as const,
    }));
    const evidence = load.lcpElementLabel ? [`Element: ${load.lcpElementLabel}`] : [];
    events.push(
      timedEvent(
        "sub-lcp",
        "LCP",
        [
          `Largest Contentful Paint at ${formatMs(load.lcp)}.`,
          load.lcpElementLabel ? `Element: ${load.lcpElementLabel}.` : null,
          largest ? `Largest subpart: ${largest.label} (${formatMs(largest.durationMs)}).` : null,
        ]
          .filter(Boolean)
          .join(" "),
        load.lcp,
        "subresources",
        bounds,
        {
          kind: "cwv",
          rating: load.lcpRating,
          evidence,
          notes: discoveryNotes.length ? discoveryNotes : undefined,
          lcpSegments: load.lcpSegments,
          lcpElement: load.lcpElement,
        },
      ),
    );
  }

  mark(load.load, "sub-load", "Window load", "Load event at", "subresources");

  mark(
    load.lastVisual,
    "sub-last-visual",
    "Last visual change",
    "Last visual change at",
    "subresources",
  );

  mark(load.interactive, "after-tti", "TTI (lab)", "Time to Interactive", "afterLoad");

  mark(load.traceEnd, "after-trace-end", "Trace end", "Performance trace ends at", "afterLoad");

  const preconnect = preconnectEvent(load.preconnectedText, load.preconnectCandidates, bounds);
  if (preconnect) events.push(preconnect);

  return events;
}
