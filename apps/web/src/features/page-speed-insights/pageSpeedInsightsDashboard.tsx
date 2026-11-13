"use client";
import { useLayoutEffect, type ReactNode } from "react";
import {
  PageSpeedInsightsProvider,
  selectPageSpeedUserLabelFilter,
  selectPageSpeedUserLabels,
  usePageSpeedItems,
  usePageSpeedReportTitle,
  usePageSpeedSelector,
  usePageSpeedUserLabelFilterActions,
} from "@/features/page-speed-insights/PageSpeedContext";
import { NullablePageSpeedInsights } from "@/lib/schema";
import { UserLabelFilter } from "@/features/page-speed-insights/UserLabelFilter";
import { PageSpeedInsightsCopyButtons } from "@/features/page-speed-insights/PageSpeedInsightsCopyButtons";
import {
  narrowLabelFilter,
  sameStringList,
} from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import {
  DashboardSearchProvider,
  useDashboardSearchState,
} from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import { PageSpeedDashboardView } from "@/features/page-speed-insights/dashboard-view/PageSpeedDashboardView";

function useSyncUserLabelFilterFromUrl() {
  const { setUserLabelFilter } = usePageSpeedUserLabelFilterActions();
  const available = usePageSpeedSelector(selectPageSpeedUserLabels);
  const current = usePageSpeedSelector(selectPageSpeedUserLabelFilter);
  const urlLabels = useDashboardSearchState().labels;

  useLayoutEffect(() => {
    if (!available.length) return;
    const next = narrowLabelFilter(urlLabels, available);
    const applied = narrowLabelFilter(current, available);
    if (sameStringList(next, applied)) return;
    setUserLabelFilter(next ?? available);
  }, [available, current, urlLabels, setUserLabelFilter]);
}

function PageSpeedInsightsDashboardContent({
  shareUrl,
  headerStart,
}: {
  shareUrl?: string;
  headerStart?: ReactNode;
}) {
  const items = usePageSpeedItems();
  const reportTitle = usePageSpeedReportTitle();
  useSyncUserLabelFilterFromUrl();

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 px-3">
        {headerStart ? <div className="shrink-0">{headerStart}</div> : null}
        <div className="min-w-0 flex-1">
          <PageSpeedInsightsCopyButtons items={items} shareUrl={shareUrl} />
        </div>
      </div>
      <div className="mb-4 flex flex-col gap-3 px-3">
        <h2
          className="min-w-0 line-clamp-3 text-lg font-bold wrap-anywhere sm:text-2xl"
          title={reportTitle}
        >
          {reportTitle}
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="shrink-0">
            <UserLabelFilter />
          </div>
        </div>
      </div>
      <PageSpeedDashboardView />
    </>
  );
}

export function PageSpeedInsightsDashboard({
  data,
  labels,
  initialSearch = "",
  shareUrl,
  headerStart,
}: {
  data: NullablePageSpeedInsights[];
  labels: string[];
  hideReport?: boolean;
  initialSearch?: string;
  shareUrl?: string;
  headerStart?: ReactNode;
}) {
  return (
    <DashboardSearchProvider initialSearch={initialSearch}>
      <PageSpeedInsightsProvider data={Array.isArray(data) ? data : undefined} labels={labels}>
        <PageSpeedInsightsDashboardContent shareUrl={shareUrl} headerStart={headerStart} />
      </PageSpeedInsightsProvider>
    </DashboardSearchProvider>
  );
}
