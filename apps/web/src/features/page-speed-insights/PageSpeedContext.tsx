"use client";

import { createContext, type ReactNode, useContext, useEffect } from "react";
import { useSelector, useStore } from "@xstate/store-react";
import {
  buildPageSpeedInsightsStoreState,
  type PageSpeedInsightsStoreInput,
  type PageSpeedInsightsStoreState,
} from "@/features/page-speed-insights/pageSpeedDashboardHelpers";

function createPageSpeedInsightsStoreConfig(input: PageSpeedInsightsStoreInput) {
  return {
    context: buildPageSpeedInsightsStoreState(input),
    on: {
      sync: (
        _context: PageSpeedInsightsStoreState,
        event: PageSpeedInsightsStoreInput,
      ): PageSpeedInsightsStoreState => buildPageSpeedInsightsStoreState(event),
    },
  };
}

export type { InsightsContextItem } from "@/lib/page-speed-insights/types";
export type { PageSpeedInsightsStoreInput } from "@/features/page-speed-insights/pageSpeedDashboardHelpers";

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

export const selectPageSpeedReportTitle = (snapshot: PageSpeedInsightsSnapshot) =>
  snapshot.context.reportTitle;

const selectPageSpeedFullPageScreenshots = (snapshot: PageSpeedInsightsSnapshot) =>
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
