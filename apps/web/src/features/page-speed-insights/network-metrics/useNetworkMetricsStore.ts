"use client";

import { usePageSpeedSelector } from "@/features/page-speed-insights/PageSpeedContext";
import { selectNetworkMetricSeries, selectNetworkRequestStats } from "./networkMetricsSelectors";

export function useNetworkMetricSeries() {
  return usePageSpeedSelector(selectNetworkMetricSeries);
}

export function useNetworkRequestStats() {
  return usePageSpeedSelector(selectNetworkRequestStats);
}
