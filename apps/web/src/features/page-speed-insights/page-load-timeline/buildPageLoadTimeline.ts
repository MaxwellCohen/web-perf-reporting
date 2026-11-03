import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { axisEndMs, buildTimelineEvents } from "./buildTimelineEvents";
import { collectTimelineSources, type CombinedLoad } from "./collectTimelineSources";
import { estimateFromAudits } from "./lantern/estimateFromReport";
import type { ModelCheckMetric, PageLoadTimeline } from "./types";

export type PageLoadTimelineBundle = {
  load: CombinedLoad;
  timeline: PageLoadTimeline;
};

const TIMES_NOTE =
  "Times are interpolated between Lighthouse's simulated FCP, LCP and Speed Index. Request durations come from the trace's fast network and are not limited by the throttled bandwidth.";

/** Replays the load the way Lighthouse does and compares FCP/LCP to its own numbers. */
export function modelCheckFor(source: InsightsContextItem): ModelCheckMetric[] | undefined {
  const lighthouseResult = source.item?.lighthouseResult;
  const formFactor = lighthouseResult?.configSettings?.formFactor;
  if (!lighthouseResult?.audits || !formFactor) return undefined;
  try {
    const result = estimateFromAudits(
      lighthouseResult.audits as Parameters<typeof estimateFromAudits>[0],
      formFactor,
    );
    if (!result) return undefined;
    const { estimate, lighthouse } = result;
    const lcp = estimate.lcp ?? estimate.fcp;
    return [
      { label: "FCP" as const, lighthouseMs: lighthouse.fcp, modelMs: estimate.fcp.timing },
      { label: "LCP" as const, lighthouseMs: lighthouse.lcp, modelMs: lcp.timing },
    ]
      .filter((metric) => metric.lighthouseMs > 0 && Number.isFinite(metric.modelMs))
      .map((metric) => ({
        ...metric,
        error: (metric.modelMs - metric.lighthouseMs) / metric.lighthouseMs,
      }));
  } catch {
    return undefined;
  }
}

export function buildPageLoadTimelineBundle(
  source: InsightsContextItem,
): PageLoadTimelineBundle | null {
  const load = collectTimelineSources(source);
  if (!load) return null;

  const events = buildTimelineEvents(load);
  return {
    load,
    timeline: {
      label: load.label,
      events,
      axisEndMs: axisEndMs(load, events),
      simulationLabel: load.simulationLabel,
      timesNote: load.simulationLabel ? TIMES_NOTE : undefined,
      modelCheck: load.simulationLabel ? modelCheckFor(source) : undefined,
    },
  };
}

export function buildPageLoadTimelineBundles(
  items: InsightsContextItem[],
): PageLoadTimelineBundle[] {
  return items
    .map((item) => buildPageLoadTimelineBundle(item))
    .filter((bundle): bundle is PageLoadTimelineBundle => bundle != null);
}
