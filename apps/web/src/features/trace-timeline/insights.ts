import type { LoadAnalysis } from "./analyzeLoad";
import { clsSessionWindows } from "./cls";
import type { InteractionEntry, ParsedTrace, TraceRequest } from "./parseTrace";

export type Rating = "good" | "needs-improvement" | "poor";

export type LcpSubpart = {
  key: "ttfb" | "loadDelay" | "loadDuration" | "renderDelay";
  label: string;
  ms: number;
};

export type LcpBreakdown = {
  /** LCP relative to navigation start. */
  timeMs: number;
  element?: string;
  url?: string;
  subparts: LcpSubpart[];
};

export type ClsCluster = {
  startMs: number;
  endMs: number;
  score: number;
  shifts: number;
  nodes: string[];
};

export type InteractionBreakdown = {
  type: string;
  target?: string;
  interactionId: number;
  startMs: number;
  durationMs: number;
  inputDelayMs: number;
  processingMs: number;
  presentationMs: number;
  rating: Rating;
};

export type InpInsight = {
  valueMs: number;
  rating: Rating;
  count: number;
  longest: InteractionBreakdown;
  interactions: InteractionBreakdown[];
};

export type RenderBlockingResource = {
  url: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  transferBytes?: number;
  type?: string;
};

export type ThirdParty = {
  origin: string;
  requests: number;
  transferBytes: number;
  mainThreadMs: number;
};

export type TraceInsights = {
  lcp?: LcpBreakdown;
  inp?: InpInsight;
  cls: { score: number; rating: Rating; clusters: ClsCluster[] };
  renderBlocking: RenderBlockingResource[];
  thirdParties: ThirdParty[];
};

const rate = (value: number, good: number, poor: number): Rating =>
  value <= good ? "good" : value <= poor ? "needs-improvement" : "poor";

/** Only http(s) origins are real parties; `new URL("chrome-extension://…").origin` is the string "null". */
const originOf = (url: string): string | undefined => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return parsed.origin;
  } catch {
    return undefined;
  }
};

const nonNegative = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

function documentRequest(trace: ParsedTrace, origin: number): TraceRequest | undefined {
  return (
    trace.requests.find((r) => r.resourceType === "Document" && r.start >= origin - 5) ??
    trace.requests.find((r) => r.url === trace.navigation?.url)
  );
}

/**
 * Pick the request that produced this LCP candidate. URLs repeat across
 * navigations and reloads, so prefer the request whose timing matches the
 * candidate's image load window instead of the first URL match.
 */
function lcpRequestFor(
  trace: ParsedTrace,
  lcp: ParsedTrace["lcpCandidates"][number],
  origin: number,
): TraceRequest | undefined {
  if (!lcp.url) return undefined;
  const candidates = trace.requests.filter((r) => r.url === lcp.url && r.start >= origin);
  if (!candidates.length) return undefined;
  const distance = (r: TraceRequest) => {
    // `imageLoad*` are navigation-relative; request times are trace-relative.
    const start = r.start - origin;
    const end = r.end - origin;
    if (lcp.imageLoadStart != null && lcp.imageLoadEnd != null) {
      return Math.abs(start - lcp.imageLoadStart) + Math.abs(end - lcp.imageLoadEnd);
    }
    if (lcp.imageLoadStart != null) return Math.abs(start - lcp.imageLoadStart);
    if (lcp.imageLoadEnd != null) return Math.abs(end - lcp.imageLoadEnd);
    return Math.abs(end - (lcp.time - origin));
  };
  return candidates.reduce((best, r) => (distance(r) < distance(best) ? r : best));
}

/**
 * Splits LCP into the same subparts DevTools shows: TTFB, resource load delay,
 * resource load duration and element render delay. Falls back to two subparts
 * for text LCP (no request) or when the trace lacks network detail.
 */
export function buildLcpBreakdown(trace: ParsedTrace, origin = trace.navigation?.time ?? 0): LcpBreakdown | undefined {
  const lcp = trace.lcpCandidates.at(-1);
  if (!lcp) return undefined;
  const lcpMs = lcp.time - origin;
  if (!(lcpMs > 0)) return undefined;

  const doc = documentRequest(trace, origin);
  const ttfbMs = doc?.headersAt != null ? doc.headersAt - origin : undefined;
  const subparts: LcpSubpart[] = [];
  const add = (key: LcpSubpart["key"], label: string, ms: number) => {
    const value = nonNegative(ms);
    // Keep every positive subpart DevTools would show, even sub-millisecond
    // ones, so the stack still sums to the LCP total.
    if (value > 0) subparts.push({ key, label, ms: value });
  };

  if (ttfbMs != null && ttfbMs > 0 && ttfbMs < lcpMs) {
    add("ttfb", "Time to first byte", ttfbMs);
    // Prefer the matched network request: DevTools' own LCP breakdown uses the
    // request's synthetic finish time, not the candidate's imageLoad* fields.
    const request = lcpRequestFor(trace, lcp, origin);
    if (request) {
      const start = request.start - origin;
      const end = request.end - origin;
      add("loadDelay", "Resource load delay", start - ttfbMs);
      add("loadDuration", "Resource load duration", end - start);
      add("renderDelay", "Element render delay", lcpMs - end);
    } else if (lcp.type === "image" && lcp.imageLoadStart != null && lcp.imageLoadEnd != null) {
      add("loadDelay", "Resource load delay", lcp.imageLoadStart - ttfbMs);
      add("loadDuration", "Resource load duration", lcp.imageLoadEnd - lcp.imageLoadStart);
      add("renderDelay", "Element render delay", lcpMs - lcp.imageLoadEnd);
    } else {
      add("renderDelay", "Element render delay", lcpMs - ttfbMs);
    }
  } else {
    add("renderDelay", "Element render delay", lcpMs);
  }

  return { timeMs: lcpMs, element: lcp.detail, url: lcp.url, subparts };
}

/** Groups layout shifts into CLS session windows (1 s gap, 5 s cap). */
export function buildClsClusters(
  trace: ParsedTrace,
  origin = trace.navigation?.time ?? 0,
): { score: number; rating: Rating; clusters: ClsCluster[] } {
  const windows = clsSessionWindows(trace.layoutShifts.filter((s) => s.time >= origin));
  const clusters: ClsCluster[] = windows.map((window) => {
    const first = window[0];
    const last = window[window.length - 1];
    return {
      startMs: first.time - origin,
      endMs: Math.min(last.time + 1000, first.time + 5000) - origin,
      score: window.reduce((sum, shift) => sum + shift.score, 0),
      shifts: window.length,
      nodes: [...new Set(window.flatMap((shift) => shift.nodes).filter(Boolean))],
    };
  });

  // CLS is the score of the worst session window, not the sum of every window
  // (Chrome's LayoutShifts model exposes this as `sessionMaxScore`).
  const score = clusters.reduce((max, c) => Math.max(max, c.score), 0);
  return { score, rating: rate(score, 0.1, 0.25), clusters };
}

function toBreakdown(interaction: InteractionEntry, origin: number): InteractionBreakdown {
  return {
    type: interaction.type,
    target: interaction.target,
    interactionId: interaction.interactionId,
    startMs: interaction.start - origin,
    durationMs: interaction.duration,
    inputDelayMs: interaction.inputDelay,
    processingMs: interaction.processing,
    presentationMs: interaction.presentation,
    rating: rate(interaction.duration, 200, 500),
  };
}

/**
 * INP is the nearest-rank 98th percentile of the longest interaction per
 * `interactionId`. Chrome keeps at most 10 interactions, so the index is
 * `min(9, floor(count / 50))` — i.e. the longest one for typical traces.
 */
export function buildInp(trace: ParsedTrace, origin = trace.navigation?.time ?? 0): InpInsight | undefined {
  const longestById = new Map<number, InteractionEntry>();
  for (const interaction of trace.interactions) {
    if (interaction.start < origin) continue;
    const current = longestById.get(interaction.interactionId);
    if (!current || interaction.duration > current.duration) longestById.set(interaction.interactionId, interaction);
  }
  const interactions = [...longestById.values()]
    .map((i) => toBreakdown(i, origin))
    .sort((a, b) => b.durationMs - a.durationMs);
  if (!interactions.length) return undefined;
  const index = Math.min(9, Math.floor(interactions.length / 50));
  const longest = interactions[index] ?? interactions[0];
  return {
    valueMs: longest.durationMs,
    rating: longest.rating,
    count: interactions.length,
    longest,
    interactions: interactions.slice(0, 10),
  };
}

export function buildRenderBlocking(
  trace: ParsedTrace,
  origin = trace.navigation?.time ?? 0,
): RenderBlockingResource[] {
  // Match DevTools: `potentially_blocking` is not render-blocking, and a
  // request that finishes after first paint did not block first render.
  const firstPaint = trace.markers.find((m) => m.name === "firstPaint")?.time;
  return trace.requests
    .filter(
      (r) =>
        r.start >= origin &&
        (r.renderBlocking === "blocking" || r.renderBlocking === "in_body_parser_blocking") &&
        (firstPaint == null || r.end <= firstPaint + 0.5),
    )
    .map((r) => ({
      url: r.url,
      startMs: r.start - origin,
      endMs: r.end - origin,
      durationMs: Math.max(0, r.end - r.start),
      transferBytes: Math.max(0, r.transferSize ?? r.resourceSize ?? 0),
      type: r.resourceType,
    }))
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 50);
}

/** Requests and CPU time per third-party origin (anything not the document's origin). */
export function buildThirdParties(
  trace: ParsedTrace,
  load: Pick<LoadAnalysis, "lcp">,
  origin = trace.navigation?.time ?? 0,
): ThirdParty[] {
  const documentOrigin = originOf(trace.navigation?.url ?? "");
  const byOrigin = new Map<string, ThirdParty>();
  const entry = (origin: string) => {
    const found = byOrigin.get(origin);
    if (found) return found;
    const created: ThirdParty = { origin, requests: 0, transferBytes: 0, mainThreadMs: 0 };
    byOrigin.set(origin, created);
    return created;
  };

  for (const request of trace.requests) {
    // Scope to this navigation: earlier documents' requests are not third
    // parties of the page under analysis.
    if (request.start < origin) continue;
    const requestOrigin = originOf(request.url);
    if (!requestOrigin || requestOrigin === documentOrigin) continue;
    const party = entry(requestOrigin);
    party.requests += 1;
    party.transferBytes += Math.max(0, request.transferSize ?? request.resourceSize ?? 0);
  }

  // Attribute CPU samples to the origin of the script that was running.
  const profile = trace.profile;
  if (profile) {
    // `load.lcp` is already relative to the navigation origin; `trace.duration`
    // is relative to the trace start. Don't add `origin` to the latter.
    const end = load.lcp != null ? origin + load.lcp : trace.duration;
    for (let i = 0; i < profile.times.length; i++) {
      const time = profile.times[i];
      if (time < origin || time > end) continue;
      const node = profile.nodes.get(profile.nodeIds[i]);
      const nodeOrigin = node?.url ? originOf(node.url) : undefined;
      if (!nodeOrigin || nodeOrigin === documentOrigin) continue;
      entry(nodeOrigin).mainThreadMs += Math.max(0, profile.weights[i]);
    }
  }

  return [...byOrigin.values()]
    .sort((a, b) => b.mainThreadMs - a.mainThreadMs || b.transferBytes - a.transferBytes)
    .slice(0, 10);
}

export function buildInsights(trace: ParsedTrace, load: LoadAnalysis): TraceInsights {
  const origin = trace.navigation?.time ?? 0;
  return {
    lcp: buildLcpBreakdown(trace, origin),
    inp: buildInp(trace, origin),
    cls: buildClsClusters(trace, origin),
    renderBlocking: buildRenderBlocking(trace, origin),
    thirdParties: buildThirdParties(trace, load, origin),
  };
}
