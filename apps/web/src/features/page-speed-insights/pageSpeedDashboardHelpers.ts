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
  allItems: InsightsContextItem[];
  items: InsightsContextItem[];
  userLabelFilter: string[] | null;
  networkMetricSeries: NetworkMetricSeries[];
  networkRequestStats: NetworkRequestStatsRow[];
  reportTitle: string;
  fullPageScreenshots: Record<string, FullPageScreenshot | undefined | null>;
};

export function filterItemsByUserLabel<T extends { label: string }>(
  items: T[],
  userLabelFilter: string[] | null,
): T[] {
  if (!userLabelFilter || userLabelFilter.length === 0) {
    return items;
  }

  return items.filter((item) => userLabelFilter.includes(item.label));
}

export function deriveFilteredDashboardState(
  allItems: InsightsContextItem[],
  userLabelFilter: string[] | null,
) {
  const items = filterItemsByUserLabel(allItems, userLabelFilter);
  const networkMetricSeries = mapItemsToNetworkMetrics(items);
  const networkRequestStats = mapNetworkMetricsToStats(networkMetricSeries);

  return {
    items,
    networkMetricSeries,
    networkRequestStats,
    fullPageScreenshots: getFullPageScreenshotMap(items),
    reportTitle: getDashboardTitle(items),
  };
}

function normalizeUserLabelFilter(
  labels: string[],
  selectedLabels: string[],
): string[] | null {
  if (selectedLabels.length === 0 || selectedLabels.length === labels.length) {
    return null;
  }

  return selectedLabels;
}

export function buildPageSpeedInsightsStoreState({
  data = [],
  labels,
  isLoading,
}: PageSpeedInsightsStoreInput): PageSpeedInsightsStoreState {
  const allItems = getDashboardItems(data, labels);

  return {
    data,
    labels,
    isLoading,
    allItems,
    userLabelFilter: null,
    ...deriveFilteredDashboardState(allItems, null),
  };
}

export function applyUserLabelFilterToState(
  state: PageSpeedInsightsStoreState,
  selectedLabels: string[],
): PageSpeedInsightsStoreState {
  const userLabelFilter = normalizeUserLabelFilter(state.labels, selectedLabels);

  return {
    ...state,
    userLabelFilter,
    ...deriveFilteredDashboardState(state.allItems, userLabelFilter),
  };
}
