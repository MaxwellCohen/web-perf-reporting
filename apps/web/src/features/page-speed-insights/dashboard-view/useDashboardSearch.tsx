"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  parseDashboardSearch,
  readLocationSearch,
  subscribeDashboardSearch,
} from "@/features/page-speed-insights/dashboard-view/dashboardSearch";

const DashboardSearchContext = createContext("");

export function DashboardSearchProvider({
  initialSearch = "",
  children,
}: {
  initialSearch?: string;
  children: ReactNode;
}) {
  return (
    <DashboardSearchContext.Provider value={initialSearch}>
      {children}
    </DashboardSearchContext.Provider>
  );
}

export function useDashboardSearchState() {
  const initialSearch = useContext(DashboardSearchContext);
  const search = useSyncExternalStore(
    subscribeDashboardSearch,
    readLocationSearch,
    () => initialSearch,
  );
  return useMemo(() => parseDashboardSearch(search), [search]);
}
