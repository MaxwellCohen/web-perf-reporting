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
  const timestamp = items.find((d) => d.item?.analysisUTCTimestamp)?.item
    ?.analysisUTCTimestamp;
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
        {hideReport ? null : (
          <h2 className="text-center text-2xl font-bold">
            {`Report for ${
              timestamp ? new Date(timestamp || 0).toLocaleDateString() : ''
            }`}
          </h2>
        )}
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
