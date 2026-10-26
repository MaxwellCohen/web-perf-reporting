"use client";
import dynamic from "next/dynamic";
import { useLayoutEffect } from "react";
import { LayoutDashboard, List } from "lucide-react";
import {
  PageSpeedInsightsStoreProvider,
  selectPageSpeedUserLabelFilter,
  selectPageSpeedUserLabels,
  usePageSpeedInsightsStore,
  usePageSpeedItems,
  usePageSpeedReportTitle,
  usePageSpeedSelector,
  useRequiredPageSpeedInsightsStore,
} from "@/features/page-speed-insights/PageSpeedContext";
import { NullablePageSpeedInsights } from "@/lib/schema";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserLabelFilter } from "@/features/page-speed-insights/UserLabelFilter";
import { PageSpeedInsightsCopyButtons } from "@/features/page-speed-insights/PageSpeedInsightsCopyButtons";
import { DashboardPanelFallback } from "@/features/page-speed-insights/dashboard-view/DashboardPanelFallback";
import {
  narrowLabelFilter,
  sameStringList,
} from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import {
  DashboardSearchProvider,
  useDashboardSearchState,
} from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import { PageSpeedDashboardView } from "@/features/page-speed-insights/dashboard-view/PageSpeedDashboardView";
import {
  isDashboardViewMode,
  useDashboardViewMode,
} from "@/features/page-speed-insights/dashboard-view/useDashboardViewMode";

const ClassicView = dynamic(() => import("./ClassicView").then((mod) => mod.ClassicView), {
  loading: () => <DashboardPanelFallback label="classic layout" />,
});

function ViewModeToggle() {
  const [viewMode, setViewMode] = useDashboardViewMode();

  return (
    <Tabs
      value={viewMode}
      onValueChange={(value) => {
        if (isDashboardViewMode(value)) setViewMode(value);
      }}
    >
      <TabsList aria-label="Report layout">
        <TabsTrigger value="dashboard" className="gap-1.5">
          <LayoutDashboard className="size-4" aria-hidden />
          Dashboard
        </TabsTrigger>
        <TabsTrigger value="classic" className="gap-1.5">
          <List className="size-4" aria-hidden />
          Classic
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

function useSyncUserLabelFilterFromUrl() {
  const store = useRequiredPageSpeedInsightsStore();
  const available = usePageSpeedSelector(selectPageSpeedUserLabels);
  const current = usePageSpeedSelector(selectPageSpeedUserLabelFilter);
  const urlLabels = useDashboardSearchState().labels;

  useLayoutEffect(() => {
    if (!available.length) return;
    const next = narrowLabelFilter(urlLabels, available);
    const applied = narrowLabelFilter(current, available);
    if (sameStringList(next, applied)) return;
    store.trigger.setUserLabelFilter({ labels: next ?? available });
  }, [available, current, urlLabels, store]);
}

function PageSpeedInsightsDashboardContent({ shareUrl }: { shareUrl?: string }) {
  const items = usePageSpeedItems();
  const reportTitle = usePageSpeedReportTitle();
  const [viewMode] = useDashboardViewMode();
  useSyncUserLabelFilterFromUrl();

  return (
    <>
      <PageSpeedInsightsCopyButtons items={items} shareUrl={shareUrl} />
      <div className="mb-4 flex flex-col gap-3 px-3">
        <h2 className="min-w-0 text-lg font-bold wrap-break-word sm:text-2xl">{reportTitle}</h2>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ViewModeToggle />
          <div className="shrink-0">
            <UserLabelFilter />
          </div>
        </div>
      </div>
      {viewMode === "dashboard" ? <PageSpeedDashboardView /> : <ClassicView />}
    </>
  );
}

export function PageSpeedInsightsDashboard({
  data,
  labels,
  initialSearch = "",
  shareUrl,
}: {
  data: NullablePageSpeedInsights[];
  labels: string[];
  hideReport?: boolean;
  initialSearch?: string;
  shareUrl?: string;
}) {
  const dataForStore: NullablePageSpeedInsights[] = Array.isArray(data) ? data : [];
  const store = usePageSpeedInsightsStore({
    data: dataForStore,
    labels,
    isLoading: false,
  });

  return (
    <DashboardSearchProvider initialSearch={initialSearch}>
      <PageSpeedInsightsStoreProvider store={store}>
        <PageSpeedInsightsDashboardContent shareUrl={shareUrl} />
      </PageSpeedInsightsStoreProvider>
    </DashboardSearchProvider>
  );
}
