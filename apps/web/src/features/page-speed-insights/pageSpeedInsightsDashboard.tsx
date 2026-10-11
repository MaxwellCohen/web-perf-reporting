"use client";
import dynamic from "next/dynamic";
import { LayoutDashboard, List } from "lucide-react";
import {
  PageSpeedInsightsStoreProvider,
  usePageSpeedInsightsStore,
  usePageSpeedItems,
  usePageSpeedReportTitle,
} from "@/features/page-speed-insights/PageSpeedContext";
import { NullablePageSpeedInsights } from "@/lib/schema";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserLabelFilter } from "@/features/page-speed-insights/UserLabelFilter";
import { PageSpeedInsightsCopyButtons } from "@/features/page-speed-insights/PageSpeedInsightsCopyButtons";
import { DashboardPanelFallback } from "@/features/page-speed-insights/dashboard-view/DashboardPanelFallback";
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

function PageSpeedInsightsDashboardContent() {
  const items = usePageSpeedItems();
  const reportTitle = usePageSpeedReportTitle();
  const [viewMode] = useDashboardViewMode();

  return (
    <>
      <PageSpeedInsightsCopyButtons items={items} />
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
}: {
  data: NullablePageSpeedInsights[];
  labels: string[];
  hideReport?: boolean;
}) {
  const dataForStore: NullablePageSpeedInsights[] = Array.isArray(data) ? data : [];
  const store = usePageSpeedInsightsStore({
    data: dataForStore,
    labels,
    isLoading: false,
  });

  return (
    <PageSpeedInsightsStoreProvider store={store}>
      <PageSpeedInsightsDashboardContent />
    </PageSpeedInsightsStoreProvider>
  );
}
