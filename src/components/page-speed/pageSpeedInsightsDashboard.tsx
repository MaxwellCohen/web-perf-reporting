'use client';
import { LoadingMessage } from '@/components/common/LoadingMessage';
import { LoadingExperience } from '@/components/page-speed/LoadingExperience';
import { EntitiesTable } from '@/components/page-speed/lh-categories/table/EntitiesTable';
import { CWVMetricsComponent } from '@/components/page-speed/CWVMetricsComponent';
import {
  PageSpeedInsightsStoreProvider,
  selectPageSpeedIsLoading,
  selectPageSpeedItems,
  selectPageSpeedReportTitle,
  usePageSpeedInsightsStore,
} from '@/components/page-speed/PageSpeedContext';
import { RenderFilmStrip } from '@/components/page-speed/RenderFilmStrip';
import { NullablePageSpeedInsights } from '@/lib/schema';
import { CategoryRow, useLHTable } from '@/components/page-speed/tsTable/useLHTable';
import { Button } from '@/components/ui/button';
import {
  StringFilterHeader,
} from '@/components/page-speed/JSUsage/JSUsageTable';
import { Accordion } from '@/components/ui/accordion';
import { DropdownFilter } from '@/components/page-speed/JSUsage/TableControls';
import { useFetchPageSpeedData } from '@/components/page-speed/useFetchPageSpeedData';
import { CopyButton } from '@/components/ui/copy-button';
import { NetworkMetricsComponent } from '@/components/page-speed/NetworkMeterics';
import { JavaScriptPerformanceComponent } from '@/components/page-speed/javascript-metrics/JavaScriptPerformanceComponent';
import { RecommendationsSection } from '@/components/page-speed/RecommendationsSection';
import type { InsightsContextItem } from '@/components/page-speed/PageSpeedContext';
import { useSelector } from '@xstate/store/react';

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
  const { data, isLoading } = useFetchPageSpeedData(url || '', defaultData);
  const store = usePageSpeedInsightsStore({ data, labels, isLoading });
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