import type { FullPageScreenshot, NullablePageSpeedInsights } from "@/lib/schema";
import {
  getDashboardItems,
  getDashboardTitle,
  getFullPageScreenshotMap,
} from "@/features/page-speed-insights/pageSpeedDashboardHelpers";
import {
  mapItemsToNetworkMetrics,
  mapNetworkMetricsToStats,
  type NetworkMetricSeries,
  type NetworkRequestStatsRow,
} from "@/features/page-speed-insights/network-metrics/useNetworkMetricsData";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

export type PageSpeedInsightsStoreInput = {
  data?: NullablePageSpeedInsights[];
  labels: string[];
  isLoading: boolean;
};

export type PageSpeedInsightsStoreState = {
  data: NullablePageSpeedInsights[];
  labels: string[];
  isLoading: boolean;
  items: InsightsContextItem[];
  networkMetricSeries: NetworkMetricSeries[];
  networkRequestStats: NetworkRequestStatsRow[];
  reportTitle: string;
  fullPageScreenshots: Record<string, FullPageScreenshot | undefined | null>;
};

export function buildPageSpeedInsightsStoreState({
  data = [],
  labels,
  isLoading,
}: PageSpeedInsightsStoreInput): PageSpeedInsightsStoreState {
  const items = getDashboardItems(data, labels);
  const networkMetricSeries = mapItemsToNetworkMetrics(items);
  const networkRequestStats = mapNetworkMetricsToStats(networkMetricSeries);

  return {
    data,
    labels,
    isLoading,
    items,
    networkMetricSeries,
    networkRequestStats,
    reportTitle: getDashboardTitle(items),
    fullPageScreenshots: getFullPageScreenshotMap(items),
  };
}
