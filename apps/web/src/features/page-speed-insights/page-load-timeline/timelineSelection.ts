import {
  getCompareRuns,
  pairByFormFactor,
} from "@/features/page-speed-insights/shared/compareRuns";
import { filterTimelineMoments, type TaskFilterSelection } from "./filterTimelineMoments";
import type { buildPageLoadTimelineBundles } from "./buildPageLoadTimeline";
import type { PageLoadTimeline } from "./types";

export type TimelineBundle = NonNullable<ReturnType<typeof buildPageLoadTimelineBundles>[number]>;

export function filterBundleTimeline(
  bundle: TimelineBundle,
  enabledTasks: TaskFilterSelection,
): PageLoadTimeline {
  const events = filterTimelineMoments(bundle.timeline.events, enabledTasks);
  return events === bundle.timeline.events ? bundle.timeline : { ...bundle.timeline, events };
}

export const TIMELINE_COMPARE_MAX = 2;

function defaultSelectedLabels(
  bundles: TimelineBundle[],
  labeledBundles: Array<{ label: string; bundle: TimelineBundle }>,
): string[] {
  const compare = getCompareRuns(labeledBundles);
  if (compare.mode === "compare") {
    const pair = pairByFormFactor(labeledBundles, compare.runs)[0];
    if (pair) {
      const labels = [pair.a?.label, pair.b?.label].filter((label): label is string => !!label);
      if (labels.length) return labels.slice(0, TIMELINE_COMPARE_MAX);
    }
  }
  return bundles[0] ? [bundles[0].timeline.label] : [];
}

export function resolveSelectedLabels(
  urlReports: string[],
  bundles: TimelineBundle[],
  labeledBundles: Array<{ label: string; bundle: TimelineBundle }>,
): string[] {
  const known = urlReports.filter((label) =>
    bundles.some((bundle) => bundle.timeline.label === label),
  );
  if (known.length) return known.slice(0, TIMELINE_COMPARE_MAX);
  return defaultSelectedLabels(bundles, labeledBundles);
}

export function toggleSelectedLabel(selected: string[], label: string): string[] {
  if (selected.includes(label)) {
    if (selected.length <= 1) return selected;
    return selected.filter((value) => value !== label);
  }
  if (selected.length < TIMELINE_COMPARE_MAX) return [...selected, label];
  return [...selected.slice(1), label];
}
