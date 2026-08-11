"use client";
import { LoadingExperiencesSection } from "@/features/page-speed-insights/loading-experience";
import { CWVMetricsComponent } from "@/features/page-speed-insights/CWVMetricsComponent";
import {
  PageSpeedInsightsStoreProvider,
  usePageSpeedInsightsStore,
  usePageSpeedItems,
  usePageSpeedReportTitle,
  useRequiredPageSpeedInsightsStore,
} from "@/features/page-speed-insights/PageSpeedContext";
import { RenderFilmStrip } from "@/features/page-speed-insights/RenderFilmStrip";
import { ScriptTreemapSection } from "@/features/page-speed-insights/script-treemap";
import { NullablePageSpeedInsights } from "@/lib/schema";
import { CategoryRow, useLHTable } from "@/features/page-speed-insights/tsTable/useLHTable";
import { Button } from "@/components/ui/button";
import { StringFilterHeader } from "@/features/page-speed-insights/tanstack-table-v9/StringFilterHeader";
import { Accordion } from "@/components/ui/accordion";
import { UserLabelFilter } from "@/features/page-speed-insights/UserLabelFilter";
import {
  LoadTimelineSection,
  NetworkWaterfallSection,
  NetworkResourcesSection,
} from "@/features/page-speed-insights/network-metrics";
import { JavaScriptPerformanceComponent } from "@/features/page-speed-insights/javascript-metrics/JavaScriptPerformanceComponent";
import { RecommendationsSection } from "@/features/page-speed-insights/RecommendationsSection";
import { PageSpeedInsightsCopyButtons } from "@/features/page-speed-insights/PageSpeedInsightsCopyButtons";

function PageSpeedInsightsDashboardContent() {
  const store = useRequiredPageSpeedInsightsStore();
  const items = usePageSpeedItems();
  const reportTitle = usePageSpeedReportTitle();
  const table = useLHTable(items);

  return (
    <>
      <PageSpeedInsightsCopyButtons items={items} />
      <div className="mb-2 flex flex-col gap-3 px-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h2 className="min-w-0 flex-1 text-lg font-bold wrap-break-word sm:text-2xl">
          {reportTitle}
        </h2>
        <div className="shrink-0 self-start">
          <UserLabelFilter />
        </div>
      </div>
      <Accordion type="multiple">
        <LoadingExperiencesSection />
        <CWVMetricsComponent />
        <RenderFilmStrip />
        <ScriptTreemapSection />
        <LoadTimelineSection />
        <NetworkWaterfallSection />
        <NetworkResourcesSection />
        <JavaScriptPerformanceComponent />
        <RecommendationsSection />
      </Accordion>
      {items.length > 0 ? (
        <div className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <StringFilterHeader column={table.getColumn("auditTitle")} name="Audit" />
          </div>
          <div className="flex shrink-0 gap-2 sm:mb-2">
            <Button
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => {
                table.resetColumnFilters();
                store.trigger.resetUserLabelFilter();
              }}
            >
              Reset filters
            </Button>
          </div>
        </div>
      ) : null}
      <Accordion type="multiple">
        {table.getRowModel().rows.map((row) => (
          <CategoryRow key={row.id} row={row} />
        ))}
      </Accordion>
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
