import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { axisEndMs, buildTimelineEvents } from "./buildTimelineEvents";
import { collectTimelineSources } from "./collectTimelineSources";
import type { PageLoadTimeline } from "./types";

export function buildPageLoadTimeline(source: InsightsContextItem): PageLoadTimeline | null {
  const load = collectTimelineSources(source);
  if (!load) return null;

  const events = buildTimelineEvents(load);
  return {
    label: load.label,
    events,
    axisEndMs: axisEndMs(load, events),
    simulationLabel: load.simulationLabel,
  };
}

export function buildPageLoadTimelines(items: InsightsContextItem[]): PageLoadTimeline[] {
  return items
    .map((item) => buildPageLoadTimeline(item))
    .filter((t): t is PageLoadTimeline => t != null);
}
