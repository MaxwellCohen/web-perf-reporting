import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { axisEndMs, buildTimelineEvents } from "./buildTimelineEvents";
import {
  collectTimelineSources,
  type CombinedLoad,
} from "./collectTimelineSources";
import type { PageLoadTimeline } from "./types";

export type PageLoadTimelineBundle = {
  load: CombinedLoad;
  timeline: PageLoadTimeline;
};

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
    },
  };
}

export function buildPageLoadTimeline(source: InsightsContextItem): PageLoadTimeline | null {
  return buildPageLoadTimelineBundle(source)?.timeline ?? null;
}

export function buildPageLoadTimelines(items: InsightsContextItem[]): PageLoadTimeline[] {
  return items
    .map((item) => buildPageLoadTimeline(item))
    .filter((t): t is PageLoadTimeline => t != null);
}

export function buildPageLoadTimelineBundles(
  items: InsightsContextItem[],
): PageLoadTimelineBundle[] {
  return items
    .map((item) => buildPageLoadTimelineBundle(item))
    .filter((bundle): bundle is PageLoadTimelineBundle => bundle != null);
}
