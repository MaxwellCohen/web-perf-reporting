'use client';
import { LoadingExperience } from './LoadingExperience';
import { EntitiesTable } from './lh-categories/table/EntitiesTable';
import { CWVMetricsComponent } from './CWVMetricsComponent';
import { fullPageScreenshotContext, InsightsContext } from './PageSpeedContext';
import { RenderFilmStrip } from './RenderFilmStrip';
import { NullablePageSpeedInsights, PageSpeedInsights } from '@/lib/schema';
import { toTitleCase } from './toTitleCase';
import { CategoryRow, useLHTable } from './tsTable/useLHTable';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import {
  StringFilterHeader,
} from './JSUsage/JSUsageTable';
import { Accordion } from '../ui/accordion';
import { DropdownFilter } from './JSUsage/TableControls';
import { useFetchPageSpeedData } from './useFetchPageSpeedData';
import { boolean } from 'drizzle-orm/mysql-core';

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
  const [mobileData = null, desktopData = null] = data || [];
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


  const messages = items.map((d) => {
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
    return <Loading />;
  }

  return (
    <fullPageScreenshotContext.Provider
      value={{
        desktopFullPageScreenshot:
          desktopData?.lighthouseResult?.fullPageScreenshot,
        DesktopFullPageScreenshot:
          desktopData?.lighthouseResult?.fullPageScreenshot,
        mobileFullPageScreenshot:
          mobileData?.lighthouseResult?.fullPageScreenshot,
        MobileFullPageScreenshot:
          mobileData?.lighthouseResult?.fullPageScreenshot,
      }}
    >
      <InsightsContext.Provider value={items}>
        <h2 className="text-center text-2xl font-bold">
          {`Report for ${
            messages.length > 1
              ? messages.join(', ')
              : messages[0] || 'unknown url'
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
          <EntitiesTable
            entities={
              data?.find((e) => e?.lighthouseResult?.entities)?.lighthouseResult
                ?.entities
            }
          />
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

  // return (
  //
  //

  //         <h2 className="text-center text-2xl font-bold">
  //           {`Report for ${
  //            messages.length > 1
  //             ? messages.join(', ')
  //             : messages[0] || 'unknown url'
  //           }`}
  //         </h2>

  //       {hideReport ? null : (
  //         <LoadingExperience
  //           title="Page Loading Experience"
  //           experienceKey="loadingExperience"
  //         />
  //       )}
  //       {hideReport ? null : (
  //         <LoadingExperience
  //           title="Origin Loading Experience"
  //           experienceKey="originLoadingExperience"
  //         />
  //       )}
  //       <RenderFilmStrip />
  //       <CWVMetricsComponent />
  //       <CWVMetricsSummary />
  //       {hideReport ? null : (
  //         <PageSpeedCategorySection data={data} labels={titleLabels} />
  //       )}
  //       <EntitiesTable
  //         entities={
  //           data.find((e) => e?.lighthouseResult?.entities)?.lighthouseResult
  //             ?.entities
  //         }
  //       />
  //     </fullPageScreenshotContext.Provider>
  //   </InsightsContext.Provider>
  // );
}


function Loading() {
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
      tests to run. it has been running for {time} seconds.
    </div>
  );
}