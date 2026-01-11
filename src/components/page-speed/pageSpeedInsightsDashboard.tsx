'use client';
import { LoadingExperience } from '@/components/page-speed/LoadingExperience';
import { EntitiesTable } from '@/components/page-speed/lh-categories/table/EntitiesTable';
import { CWVMetricsComponent } from '@/components/page-speed/CWVMetricsComponent';
import { fullPageScreenshotContext, InsightsContext } from '@/components/page-speed/PageSpeedContext';
import { RenderFilmStrip } from '@/components/page-speed/RenderFilmStrip';
import { NullablePageSpeedInsights, PageSpeedInsights } from '@/lib/schema';
import { toTitleCase } from '@/components/page-speed/toTitleCase';
import { CategoryRow, useLHTable } from '@/components/page-speed/tsTable/useLHTable';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  StringFilterHeader,
} from '@/components/page-speed/JSUsage/JSUsageTable';
import { Accordion } from '@/components/ui/accordion';
import { DropdownFilter } from '@/components/page-speed/JSUsage/TableControls';
import { useFetchPageSpeedData } from '@/components/page-speed/useFetchPageSpeedData';
import { boolean } from 'drizzle-orm/mysql-core';
import { CopyButton } from '@/components/ui/copy-button';
import { NetworkMetricsComponent } from '@/components/page-speed/NetworkMeterics';
import { JavaScriptPerformanceComponent } from '@/components/page-speed/javascript-metrics/JavaScriptPerformanceComponent';
import { RecommendationsSection } from '@/components/page-speed/RecommendationsSection';
import { RenderNetworkDependencyTree } from '@/components/page-speed/lh-categories/table/RenderNetworkDependencyTree';

const loadingExperiences = [
  { title: 'Page Loading Experience', experienceKey: 'loadingExperience' },
  {
    title: 'Origin Loading Experience',
    experienceKey: 'originLoadingExperience',
  },
] as const;

export function PageSpeedInsightsDashboard({
  data : defaultData,
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
  const items = useMemo(
    () =>
      data
        ?.map((item, i) => ({
          item: (item?.lighthouseResult
            ? (item as PageSpeedInsights)
            : (item as PageSpeedInsights['lighthouseResult'])?.lighthouseVersion
              ? ({ lighthouseResult: item } as unknown as PageSpeedInsights)
              : null) as unknown as PageSpeedInsights,
          label: labels[i] || '',
        }))
        .filter(({ item }) => !!item) || [],
    [data, labels],
  );

  const table = useLHTable(items);
  console.log(table);


  const titleStrings = items.map((d) => {
    return [
      d.item?.lighthouseResult?.finalDisplayedUrl || 'unknown url',
      d.item.lighthouseResult?.configSettings?.formFactor
        ? `on ${toTitleCase(d.item.lighthouseResult?.configSettings?.formFactor)}`
        : '',
      d.item?.analysisUTCTimestamp
        ? ` at ${new Date(d.item?.analysisUTCTimestamp).toLocaleDateString()}`
        : '',
    ]
      .join(' ')
      .trim();
  });

  const tableState = table.getState();
  console.log('expanded', tableState.expanded);

  if (isLoading || !data?.filter(boolean).length) {
    return <LoadingMessage />;
  }

  return (
    <fullPageScreenshotContext.Provider
      value={items.reduce((acc, d) => ({
        ...acc,
        [d.label]: d.item?.lighthouseResult?.fullPageScreenshot,
      }), {})}
    >
      <InsightsContext.Provider value={items}>
      <div className="flex flex-row justify-end gap-4">
        { items.map((d,i) => (
          <CopyButton key={i} size="lg" text={JSON.stringify(d.item) || ''} > {d.label} </CopyButton>
        )) }
      </div>
        <h2 className="text-center text-2xl font-bold">
          {`Report for ${
            titleStrings.length > 1
              ? titleStrings.join(', ')
              : titleStrings[0] || 'unknown url'
          }`}
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
          <RenderNetworkDependencyTree />
          <JavaScriptPerformanceComponent />
          <RecommendationsSection />
        </Accordion>
        <div className="items-bottom flex flex-row justify-between gap-4 px-3 py-4">
          <div className="flex flex-col">
            <StringFilterHeader
              column={table.getColumn('auditTitle')}
              name={'Audit'}
            />
          </div>
          <div className="mb-2 flex self-end justify-self-end">
            <Button variant="ghost" onClick={() => table.resetColumnFilters()}>
              Reset filters
            </Button>
            <DropdownFilter table={table} columnId={'userLabel'} />
          </div>
        </div>
        <Accordion type="multiple">
          {table.getRowModel().rows.map((row, index) => (
            <CategoryRow key={`${index}_${row.id}`} row={row}></CategoryRow>
          ))}
        </Accordion>
      </InsightsContext.Provider>
    </fullPageScreenshotContext.Provider>
  );
}


function LoadingMessage() {
  const [time, setTime] = useState(0);

   useEffect(() => {
    const interval = setInterval(() => {
      setTime((t) => {return ( t || 0 ) + 1});
    }, 1000);
    return () => clearInterval(interval);
  }, [time])
  
  return (
    <div className="flex flex-col items-center justify-center">
      Loading Page Speed Insights data is loading...please wait we have lots of
      tests to run. It has been running for {time} seconds.
    </div>
  );
}