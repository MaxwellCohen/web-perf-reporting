/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { LoadingExperience } from './LoadingExperience';
import { EntitiesTable } from './EntitiesTable';
import { CWVMetricsComponent } from './CWVMetricsComponent';
import { PageSpeedCategorySection } from './lh-categories/PageSpeedCategorySection';
import { fullPageScreenshotContext, InsightsContext } from './PageSpeedContext';
// import { useFetchPageSpeedData } from './useFetchPageSpeedData';
import { RenderFilmStrip } from './RenderFilmStrip';
import { CWVMetricsSummary } from './CWVMetricsSummary';
import { NullablePageSpeedInsights, PageSpeedInsights } from '@/lib/schema';
import { toTitleCase } from './toTitleCase';
import { AuditSummaryRow, CategoryRow, useLHTable } from './tsTable/useLHTable';
import { Fragment, useId, useMemo } from 'react';
import { Button } from '../ui/button';
import { Ghost } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ExpandAll, ExpandRow } from './JSUsage/JSUsageTable';
import { Accordion } from '../ui/accordion';
import clsx from 'clsx';
import { flexRender } from '@tanstack/react-table';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { DropdownFilter } from './JSUsage/TableControls';

const loadingExperiences = [
  { title: 'Page Loading Experience', experienceKey: 'loadingExperience' },
  {
    title: 'Origin Loading Experience',
    experienceKey: 'originLoadingExperience',
  },
] as const;

export function PageSpeedInsightsDashboard({
  data,
  labels,
  hideReport,
}: {
  data: NullablePageSpeedInsights[];
  labels: string[];
  hideReport?: boolean;
}) {
  const [mobileData, desktopData] = data || [];
  const items = useMemo(
    () =>
      data
        .map((item, i) => ({
          item: (item?.lighthouseResult
            ? (item as PageSpeedInsights)
            : (item as PageSpeedInsights['lighthouseResult'])?.lighthouseVersion
              ? ({ lighthouseResult: item } as unknown as PageSpeedInsights)
              : null) as unknown as PageSpeedInsights,
          label: labels[i] || '',
        }))
        .filter(({ item }) => !!item),
    [data, labels],
  );

  const table = useLHTable(items);
  console.log(table);

  //  console.log(tableDataArr)

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
  const id = useId();
  console.log('expanded', tableState.expanded);

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
        </Accordion>
        <div className="items-bottom flex flex-row  justify-between gap-4 px-3 py-4">
          <div className="flex flex-col">
            <Label htmlFor={`filter_${id}`} className='mb-3'>Audit Filter</Label>
            <Input
              placeholder="Filter Audits..."
              id={`filter_${id}`}
              value={
                (table.getColumn('auditTitle')?.getFilterValue() as string) ??
                ''
              }
              onChange={(event) =>
                table
                  .getColumn('auditTitle')
                  ?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          </div>
          <div className="self-end justify-self-end">
          
            <Button variant="ghost" onClick={() => table.resetColumnFilters()}>
              Reset filters
            </Button>
            {/* <Button variant="ghost" onClick={() => table.resetSorting()}>
              Reset Sorting Order
            </Button> */}
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
