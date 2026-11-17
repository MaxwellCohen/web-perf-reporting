"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import {
  deriveFilteredDashboardState,
  getDashboardItems,
  normalizeUserLabelFilter,
  type PageSpeedInsightsState,
} from "@/features/page-speed-insights/pageSpeedDashboardHelpers";
import type { NullablePageSpeedInsights } from "@/lib/schema";

export type { InsightsContextItem } from "@/lib/page-speed-insights/types";

/** Selector input shape: `{ context }` so selectors also accept `{ context: { items } }` stubs. */
export type PageSpeedInsightsSnapshot = { context: PageSpeedInsightsState };

type PageSpeedInsightsContextValue = {
  snapshot: PageSpeedInsightsSnapshot;
  setUserLabelFilter: (labels: string[]) => void;
  resetUserLabelFilter: () => void;
};

const PageSpeedInsightsContext = createContext<PageSpeedInsightsContextValue | null>(null);

const EMPTY_DATA: NullablePageSpeedInsights[] = [];

const selectPageSpeedItems = (snapshot: PageSpeedInsightsSnapshot) => snapshot.context.items;

const selectPageSpeedReportTitle = (snapshot: PageSpeedInsightsSnapshot) =>
  snapshot.context.reportTitle;

export const selectPageSpeedUserLabels = (snapshot: PageSpeedInsightsSnapshot) =>
  snapshot.context.labels;

export const selectPageSpeedUserLabelFilter = (snapshot: PageSpeedInsightsSnapshot) =>
  snapshot.context.userLabelFilter;

const selectPageSpeedFullPageScreenshots = (snapshot: PageSpeedInsightsSnapshot) =>
  snapshot.context.fullPageScreenshots;

export function PageSpeedInsightsProvider({
  data = EMPTY_DATA,
  labels,
  children,
}: {
  data?: NullablePageSpeedInsights[];
  labels: string[];
  children: ReactNode;
}) {
  const [userLabelFilter, setFilter] = useState<string[] | null>(null);
  const allItems = useMemo(() => getDashboardItems(data, labels), [data, labels]);
  const derived = useMemo(
    () => deriveFilteredDashboardState(allItems, userLabelFilter),
    [allItems, userLabelFilter],
  );
  const setUserLabelFilter = useCallback(
    (selected: string[]) => setFilter(normalizeUserLabelFilter(labels, selected)),
    [labels],
  );
  const resetUserLabelFilter = useCallback(() => setFilter(null), []);

  const value = useMemo<PageSpeedInsightsContextValue>(
    () => ({
      snapshot: { context: { data, labels, allItems, userLabelFilter, ...derived } },
      setUserLabelFilter,
      resetUserLabelFilter,
    }),
    [data, labels, allItems, userLabelFilter, derived, setUserLabelFilter, resetUserLabelFilter],
  );

  return (
    <PageSpeedInsightsContext.Provider value={value}>{children}</PageSpeedInsightsContext.Provider>
  );
}

function useRequiredPageSpeedInsightsContext() {
  const value = useContext(PageSpeedInsightsContext);

  if (!value) {
    throw new Error("PageSpeed insights context is unavailable outside the dashboard provider.");
  }

  return value;
}

export function usePageSpeedUserLabelFilterActions() {
  const { setUserLabelFilter, resetUserLabelFilter } = useRequiredPageSpeedInsightsContext();
  return useMemo(
    () => ({ setUserLabelFilter, resetUserLabelFilter }),
    [setUserLabelFilter, resetUserLabelFilter],
  );
}

export function usePageSpeedSelector<T>(selector: (snapshot: PageSpeedInsightsSnapshot) => T) {
  const { snapshot } = useRequiredPageSpeedInsightsContext();
  return useMemo(() => selector(snapshot), [selector, snapshot]);
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
