import type { PageSpeedInsightsSnapshot } from "@/features/page-speed-insights/PageSpeedContext";
import {
  mapNetworkMetricsToStats,
  type NetworkMetricSeries,
  type NetworkRequestStatsRow,
} from "./useNetworkMetricsData";

export function selectNetworkMetricSeries(
  snapshot: PageSpeedInsightsSnapshot,
): NetworkMetricSeries[] {
  return snapshot.context.networkMetricSeries;
}

export function selectNetworkRequestStats(
  snapshot: PageSpeedInsightsSnapshot,
): NetworkRequestStatsRow[] {
  return mapNetworkMetricsToStats(snapshot.context.networkMetricSeries);
}
