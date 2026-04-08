"use client";

import { createContext, type ReactNode, useContext, useEffect } from "react";
import { useSelector, useStore } from "@xstate/store-react";
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

type PageSpeedInsightsStoreInput = {
  data?: NullablePageSpeedInsights[];
  labels: string[];
  isLoading: boolean;
};

type PageSpeedInsightsStoreState = {
  data: NullablePageSpeedInsights[];
  labels: string[];
  isLoading: boolean;
  items: InsightsContextItem[];
  networkMetricSeries: NetworkMetricSeries[];
  networkRequestStats: NetworkRequestStatsRow[];
  reportTitle: string;
  fullPageScreenshots: Record<string, FullPageScreenshot | undefined | null>;
};

function createPageSpeedInsightsState({
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

function createPageSpeedInsightsStoreConfig(input: PageSpeedInsightsStoreInput) {
  return {
    context: createPageSpeedInsightsState(input),
    on: {
      sync: (
        _context: PageSpeedInsightsStoreState,
        event: PageSpeedInsightsStoreInput,
      ): PageSpeedInsightsStoreState => createPageSpeedInsightsState(event),
    },
  };
}

export type { InsightsContextItem } from "@/lib/page-speed-insights/types";

export function usePageSpeedInsightsStore(input: PageSpeedInsightsStoreInput) {
  const { data, isLoading, labels } = input;
  const store = useStore(createPageSpeedInsightsStoreConfig({ data, isLoading, labels }));

  useEffect(() => {
    store.trigger.sync({ data, isLoading, labels });
  }, [data, isLoading, labels, store]);

  return store;
}

type PageSpeedInsightsStore = ReturnType<typeof usePageSpeedInsightsStore>;
export type PageSpeedInsightsSnapshot = ReturnType<PageSpeedInsightsStore["getSnapshot"]>;

const PageSpeedInsightsStoreContext = createContext<PageSpeedInsightsStore | null>(null);

export const selectPageSpeedItems = (snapshot: PageSpeedInsightsSnapshot) => snapshot.context.items;

export const selectPageSpeedNetworkMetricSeries = (snapshot: PageSpeedInsightsSnapshot) =>
  snapshot.context.networkMetricSeries;

export const selectPageSpeedReportTitle = (snapshot: PageSpeedInsightsSnapshot) =>
  snapshot.context.reportTitle;

export const selectPageSpeedFullPageScreenshots = (snapshot: PageSpeedInsightsSnapshot) =>
  snapshot.context.fullPageScreenshots;

export const selectPageSpeedIsLoading = (snapshot: PageSpeedInsightsSnapshot) =>
  snapshot.context.isLoading;

export function PageSpeedInsightsStoreProvider({
  store,
  children,
}: {
  store: PageSpeedInsightsStore;
  children: ReactNode;
}) {
  return (
    <PageSpeedInsightsStoreContext.Provider value={store}>
      {children}
    </PageSpeedInsightsStoreContext.Provider>
  );
}

function useRequiredPageSpeedInsightsStore() {
  const store = useContext(PageSpeedInsightsStoreContext);

  if (!store) {
    throw new Error("PageSpeed insights store is unavailable outside the dashboard provider.");
  }

  return store;
}

export function usePageSpeedSelector<T>(selector: (snapshot: PageSpeedInsightsSnapshot) => T) {
  const store = useRequiredPageSpeedInsightsStore();
  return useSelector(store, selector);
}

export function usePageSpeedItems() {
  return usePageSpeedSelector(selectPageSpeedItems);
}

export function usePageSpeedReportTitle() {
  return usePageSpeedSelector(selectPageSpeedReportTitle);
}

export function useFullPageScreenshots() {
  return usePageSpeedSelector(selectPageSpeedFullPageScreenshots);
}
