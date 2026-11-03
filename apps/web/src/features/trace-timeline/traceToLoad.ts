import type { CombinedLoad, CombinedRequest } from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";
import type { ParsedTrace } from "./parseTrace";

function blocking(v?: string): CombinedRequest["renderBlocking"] {
  return v === "blocking" ? "blocking" : v === "in_body_parser_blocking" || v === "potentially_blocking" ? "potentially-blocking" : "non-blocking";
}

/** Adapt a parsed trace to the Lighthouse-shaped load the CWV waterfall renders. */
export function traceToCombinedLoad(trace: ParsedTrace, label = "Trace"): CombinedLoad {
  const t = (name: string) => trace.markers.find((m) => m.name === name)?.time;
  const requests: CombinedRequest[] = trace.requests.map((r) => ({
    url: r.url,
    resourceType: r.resourceType,
    networkRequestTime: r.start,
    networkEndTime: Math.max(r.end, r.start + 1),
    transferSize: r.transferSize,
    resourceSize: r.resourceSize,
    statusCode: r.statusCode,
    protocol: r.protocol,
    mimeType: r.mimeType,
    isLinkPreload: r.isLinkPreload,
    priority: r.priority,
    renderBlocking: blocking(r.renderBlocking),
    isCriticalChain: false,
  }));
  return {
    label,
    fcp: t("firstContentfulPaint"),
    observedFcp: t("firstContentfulPaint"),
    lcp: t("largestContentfulPaint::Candidate"),
    observedLcp: t("largestContentfulPaint::Candidate"),
    firstPaint: t("firstPaint"),
    dcl: t("domContentLoadedEventEnd"),
    load: t("loadEventEnd"),
    traceEnd: trace.duration,
    ttfbObserved: false,
    document: requests[0],
    requests,
    redirectHops: [],
    redirectAuditUrls: [],
    longTasks: trace.longTasks.map((l) => ({ startTime: l.start, duration: l.dur })),
    userTimings: [],
    screenshots: trace.screenshots.map((s) => ({ timing: Math.round(s.time), data: `data:image/jpeg;base64,${s.data}` })),
    lcpSegments: [],
    lcpDiscoveryFailures: [],
    layoutShifts: [],
    preconnectCandidates: [],
  };
}
