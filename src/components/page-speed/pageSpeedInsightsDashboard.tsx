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
  const items = data
    .map((item, i) => ({
      item: (item?.lighthouseResult
        ? (item as PageSpeedInsights)
        : (item as PageSpeedInsights['lighthouseResult'])?.lighthouseVersion
          ? ({ lighthouseResult: item } as unknown as PageSpeedInsights)
          : null) as unknown as PageSpeedInsights,
      label: labels[i] || '',
    }))
    .filter(({ item }) => !!item);
  const titleLabels = labels;

// type TableDataItem = {
//   _category: {
//     id?: string;
//     title?: string;
//     score?: number;
//   };
//   _userLabel: string;
//   id?: string;
//   weight: number;
//   group?: string;
//   title?: string;
//   description?: string;
//   score?: number;
//   displayValue?: string;
//   details?: Record<string, unknown>;
// };

// const tableDataArr: TableDataItem[] = items
//    .map(({ item, label }) => {
//      // flaten the categories
//      return Object.values(item.lighthouseResult?.categories || {}).map((category) => {
//       if (!category?.auditRefs?.length ) {return null;}
//       const {auditRefs = [], ..._category } = category;
//       return auditRefs.map((ar) => {
//         if(!ar.id) return null;
//         return {
//           _category,
//           _userLabel: label,
//           ...ar,
//           ...(item.lighthouseResult?.audits?.[ar.id] || {}),
//         }
//       });
//     });
//   }).flat(2)
    

  //  console.log(tableDataArr)

  const messages = items.map((d) => {
     return [d.item?.lighthouseResult?.finalDisplayedUrl || 'unknown url',
      d.item.lighthouseResult?.configSettings?.formFactor ? `on ${toTitleCase(d.item.lighthouseResult?.configSettings?.formFactor)}` : '',
      d.item?.analysisUTCTimestamp ? ` at ${new Date(d.item?.analysisUTCTimestamp).toLocaleDateString()}` : ''].join(' ').trim();
  });
  
  

  return (
    <InsightsContext.Provider value={items}>
      <fullPageScreenshotContext.Provider
        value={{
          desktopFullPageScreenshot:
            desktopData?.lighthouseResult?.fullPageScreenshot,
          mobileFullPageScreenshot:
            mobileData?.lighthouseResult?.fullPageScreenshot,
        }}
      >
        
          <h2 className="text-center text-2xl font-bold">
            {`Report for ${
             messages.length > 1
              ? messages.join(', ')
              : messages[0] || 'unknown url'
            }`}
          </h2>
   
        {hideReport ? null : (
          <LoadingExperience
            title="Page Loading Experience"
            experienceKey="loadingExperience"
          />
        )}
        {hideReport ? null : (
          <LoadingExperience
            title="Origin Loading Experience"
            experienceKey="originLoadingExperience"
          />
        )}
        <RenderFilmStrip />
        <CWVMetricsComponent /> 
        <CWVMetricsSummary />
        {hideReport ? null : (
          <PageSpeedCategorySection data={data} labels={titleLabels} />
        )}
        <EntitiesTable
          entities={
            data.find((e) => e?.lighthouseResult?.entities)?.lighthouseResult
              ?.entities
          }
        />
      </fullPageScreenshotContext.Provider>
    </InsightsContext.Provider>
  );
}
