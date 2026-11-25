"use client";

import { useMemo } from "react";
import {
  buildOverviewModel,
  collectMetricSources,
} from "@/features/page-speed-insights/dashboard-view/overview/overviewModel";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";

export function useOverviewModel() {
  const items = usePageSpeedItems();
  return useMemo(() => {
    const sources = collectMetricSources(items);
    return { items, sources, model: buildOverviewModel(sources) };
  }, [items]);
}
