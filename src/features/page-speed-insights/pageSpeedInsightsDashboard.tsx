'use client';
import { LoadingMessage } from '@/components/common/LoadingMessage';
import { LoadingExperience } from '@/features/page-speed-insights/LoadingExperience';
import { EntitiesTable } from '@/features/page-speed-insights/lh-categories/table/EntitiesTable';
import { CWVMetricsComponent } from '@/features/page-speed-insights/CWVMetricsComponent';
import {
  PageSpeedInsightsStoreProvider,
  selectPageSpeedIsLoading,
  selectPageSpeedItems,
  selectPageSpeedReportTitle,
  usePageSpeedInsightsStore,
} from '@/features/page-speed-insights/PageSpeedContext';
import { RenderFilmStrip } from '@/features/page-speed-insights/RenderFilmStrip';
import { NullablePageSpeedInsights } from '@/lib/schema';
import { CategoryRow, useLHTable } from '@/features/page-speed-insights/tsTable/useLHTable';
import { Button } from '@/components/ui/button';
import {
  StringFilterHeader,
} from '@/features/page-speed-insights/JSUsage/JSUsageTable';
import { Accordion } from '@/components/ui/accordion';
import { DropdownFilter } from '@/features/page-speed-insights/JSUsage/TableControls';
import { usePageSpeedInsightsQuery } from '@/features/page-speed-insights/data/usePageSpeedInsightsQuery';
import { CopyButton } from '@/components/ui/copy-button';
import { NetworkMetricsComponent } from '@/features/page-speed-insights/NetworkMetrics';
import { JavaScriptPerformanceComponent } from '@/features/page-speed-insights/javascript-metrics/JavaScriptPerformanceComponent';
import { RecommendationsSection } from '@/features/page-speed-insights/RecommendationsSection';
import type { InsightsContextItem } from '@/lib/page-speed-insights/types';
import { useSelector } from '@xstate/store-react';

const loadingExperiences = [
  { title: 'Page Loading Experience', experienceKey: 'loadingExperience' },
  {
    title: 'Origin Loading Experience',
    experienceKey: 'originLoadingExperience',
  },
] as const;

export function PageSpeedInsightsDashboard({
  data: defaultData,
  url,
  labels,
}: {
  data: NullablePageSpeedInsights[];
  labels: string[];
  hideReport?: boolean;
  url?: string;
}) {
  'use no memo';
  const { data, isLoading } = usePageSpeedInsightsQuery(
    { mode: 'url', url: url || '' },
    defaultData,
  );
  const dataForStore: NullablePageSpeedInsights[] = Array.isArray(data)
    ? data
    : [];
  const store = usePageSpeedInsightsStore({
    data: dataForStore,
    labels,
    isLoading,
  });
  const dashboardIsLoading = useSelector(store, selectPageSpeedIsLoading);
  const items: InsightsContextItem[] = useSelector(store, selectPageSpeedItems);
  const reportTitle = useSelector(store, selectPageSpeedReportTitle);

  const table = useLHTable(items);

  if (dashboardIsLoading || items.length === 0) {
    return <LoadingMessage />;
  }

  return (
    <PageSpeedInsightsStoreProvider store={store}>
      <div className="flex flex-row justify-end gap-4">
        {items.map((item) => (
          <CopyButton
            key={item.label}
            size="lg"
            text={JSON.stringify(item.item) || ''}
          >
            {item.label}
          </CopyButton>
        ))}
      </div>
      <h2 className="text-center text-2xl font-bold">
        {reportTitle}
      </h2>
      <Accordion type="multiple">
        {loadingExperiences.map(({ title, experienceKey }) => (
          <LoadingExperience
            key={experienceKey}
            title={title}
            experienceKey={experienceKey}
          />
        ))}
        <CWVMetricsComponent />
        <RenderFilmStrip />
        <EntitiesTable />
        <NetworkMetricsComponent />
        <JavaScriptPerformanceComponent />
        <RecommendationsSection />
      </Accordion>
      <div className="items-bottom flex flex-row justify-between gap-4 px-3 py-4">
        <div className="flex flex-col">
          <StringFilterHeader
            column={table.getColumn('auditTitle')}
            name="Audit"
          />
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