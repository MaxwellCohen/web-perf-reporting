import type {
  FullPageScreenshot,
  NullablePageSpeedInsights,
  PageSpeedInsights,
} from "@/lib/schema";
import type { PageSpeedDashboardItem, InsightsContextItem } from "@/lib/page-speed-insights/types";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import {
  mapItemsToNetworkMetrics,
  mapNetworkMetricsToStats,
  type NetworkMetricSeries,
  type NetworkRequestStatsRow,
} from "@/features/page-speed-insights/network-metrics/useNetworkMetricsData";

function normalizePageSpeedItem(item: NullablePageSpeedInsights): PageSpeedInsights | null {
  if (item?.lighthouseResult) {
    return item as PageSpeedInsights;
  }

  if ((item as PageSpeedInsights["lighthouseResult"])?.lighthouseVersion) {
    return { lighthouseResult: item } as unknown as PageSpeedInsights;
  }

  return null;
}

export function getDashboardItems(
  data: NullablePageSpeedInsights[] | undefined,
  labels: string[],
): PageSpeedDashboardItem[] {
  return (
    data
      ?.map((item, index) => {
        const normalizedItem = normalizePageSpeedItem(item);

        if (!normalizedItem) {
          return null;
        }

        return {
          item: normalizedItem,
          label: labels[index] || "",
        };
      })
      .filter((item): item is PageSpeedDashboardItem => item != null) || []
  );
}

export function getDashboardTitle(items: PageSpeedDashboardItem[]): string {
  const titleStrings = items.map(({ item }) =>
    [
      item?.lighthouseResult?.finalDisplayedUrl || "unknown url",
      item.lighthouseResult?.configSettings?.formFactor
        ? `on ${toTitleCase(item.lighthouseResult.configSettings.formFactor)}`
        : "",
      item?.analysisUTCTimestamp
        ? `at ${new Date(item.analysisUTCTimestamp).toLocaleDateString()}`
        : "",
    ]
      .join(" ")
      .trim(),
  );

  const reportTitle = titleStrings.length > 1 ? titleStrings.join(", ") : titleStrings[0];

  return `Report for ${reportTitle || "unknown url"}`;
}

export function getFullPageScreenshotMap(
  items: PageSpeedDashboardItem[],
): Record<string, FullPageScreenshot | undefined | null> {
  return items.reduce<Record<string, FullPageScreenshot | undefined | null>>(
    (screenshotsByLabel, { item, label }) => {
      screenshotsByLabel[label] = item?.lighthouseResult?.fullPageScreenshot;
      return screenshotsByLabel;
    },
    {},
  );
}

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
