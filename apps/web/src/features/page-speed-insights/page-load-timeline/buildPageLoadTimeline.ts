import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { axisEndMs, buildTimelineEvents } from "./buildTimelineEvents";
import { collectTimelineSources, type CombinedLoad } from "./collectTimelineSources";
import type { PageLoadTimeline } from "./types";

export type PageLoadTimelineBundle = {
  load: CombinedLoad;
  timeline: PageLoadTimeline;
};

const TIMES_NOTE =
  "Times are interpolated between Lighthouse's simulated FCP, LCP and Speed Index. Request durations come from the trace's fast network and are not limited by the throttled bandwidth.";

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
