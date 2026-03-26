"use client";
import { LoadingMessage } from "@/components/common/LoadingMessage";
import { LoadingExperiencesSection } from "@/features/page-speed-insights/loading-experience";
import { EntitiesTable } from "@/features/page-speed-insights/lh-categories/table/EntitiesTable";
import { CWVMetricsComponent } from "@/features/page-speed-insights/CWVMetricsComponent";
import {
  PageSpeedInsightsStoreProvider,
  selectPageSpeedIsLoading,
  selectPageSpeedItems,
  selectPageSpeedReportTitle,
  usePageSpeedInsightsStore,
} from "@/features/page-speed-insights/PageSpeedContext";
import { RenderFilmStrip } from "@/features/page-speed-insights/RenderFilmStrip";
import { NullablePageSpeedInsights } from "@/lib/schema";
import { CategoryRow, useLHTable } from "@/features/page-speed-insights/tsTable/useLHTable";
import { Button } from "@/components/ui/button";
import { StringFilterHeader } from "@/features/page-speed-insights/JSUsage/JSUsageTable";
import { Accordion } from "@/components/ui/accordion";
import { DropdownFilter } from "@/features/page-speed-insights/JSUsage/TableControls";
import { NetworkMetricsComponent } from "@/features/page-speed-insights/network-metrics";
import { JavaScriptPerformanceComponent } from "@/features/page-speed-insights/javascript-metrics/JavaScriptPerformanceComponent";
import { RecommendationsSection } from "@/features/page-speed-insights/RecommendationsSection";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { PageSpeedInsightsCopyButtons } from "@/features/page-speed-insights/PageSpeedInsightsCopyButtons";
import { useSelector } from "@xstate/store-react";

export function PageSpeedInsightsDashboard({
  data,
  labels,
}: {
  data: NullablePageSpeedInsights[];
  labels: string[];
  hideReport?: boolean;
}) {
  "use no memo";

  const dataForStore: NullablePageSpeedInsights[] = Array.isArray(data) ? data : [];
  const store = usePageSpeedInsightsStore({
    data: dataForStore,
    labels,
    isLoading: false,
  });
  const items: InsightsContextItem[] = useSelector(store, selectPageSpeedItems);
  const reportTitle = useSelector(store, selectPageSpeedReportTitle);

  const table = useLHTable(items);

  return (
    <PageSpeedInsightsStoreProvider store={store}>
      <PageSpeedInsightsCopyButtons items={items} />
      <h2 className="text-center text-2xl font-bold">{reportTitle}</h2>
      <Accordion type="multiple">
        <LoadingExperiencesSection />
        <CWVMetricsComponent />
        <RenderFilmStrip />
        <EntitiesTable />
        <NetworkMetricsComponent />
        <JavaScriptPerformanceComponent />
        <RecommendationsSection />
      </Accordion>
      <div className="items-bottom flex flex-row justify-between gap-4 px-3 py-4">
        <div className="flex flex-col">
          <StringFilterHeader column={table.getColumn("auditTitle")} name="Audit" />
        </div>
        <div className="mb-2 flex self-end justify-self-end">
          <Button variant="ghost" onClick={() => table.resetColumnFilters()}>
            Reset filters
          </Button>
          <DropdownFilter table={table} columnId="userLabel" />
        </div>
      </div>
      <Accordion type="multiple">
        {table.getRowModel().rows.map((row) => (
          <CategoryRow key={row.id} row={row} />
        ))}
      </Accordion>
    </PageSpeedInsightsStoreProvider>
  );
}
