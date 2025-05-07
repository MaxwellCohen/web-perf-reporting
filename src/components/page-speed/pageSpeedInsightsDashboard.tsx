'use client';
import { LoadingExperience } from './LoadingExperience';
import { EntitiesTable } from './EntitiesTable';
import { CWVMetricsComponent } from './CWVMetricsComponent';
import { PageSpeedCategorySection } from './lh-categories/PageSpeedCategorySection';
import { fullPageScreenshotContext } from './PageSpeedContext';
// import { useFetchPageSpeedData } from './useFetchPageSpeedData';
import { RenderFilmStrip } from './RenderFilmStrip';
import { CWVMetricsSummary } from './CWVMetricsSummary';
import { NullablePageSpeedInsights } from '@/lib/schema';

export function PageSpeedInsightsDashboard({
  data,
  labels,
  hideReport,
}: {
  data: NullablePageSpeedInsights[];
  labels: string[];
  hideReport?: boolean;
}) {
  const [ mobileData, desktopData] = data || [];

  const categoryGroups = data.map(
    (d) => d?.lighthouseResult?.categoryGroups ?? null,
  );
  const audits = data.map((d) => d?.lighthouseResult?.audits ?? null);

  const titleLabels = labels;
  const timestamp = data.find(
    (d) => d?.analysisUTCTimestamp,
  )?.analysisUTCTimestamp;
  return (
    <fullPageScreenshotContext.Provider
      value={{
        desktopFullPageScreenshot:
          desktopData?.lighthouseResult?.fullPageScreenshot,
        mobileFullPageScreenshot:
          mobileData?.lighthouseResult.fullPageScreenshot,
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
          experiences={data.map((d) => d?.loadingExperience || null)}
          labels={titleLabels}
        />
      )}
      {hideReport ? null : (
        <LoadingExperience
          title="Origin Loading Experience"
          experiences={data.map((d) => d?.originLoadingExperience || null)}
          labels={titleLabels}
        />
      )}
      <RenderFilmStrip data={data} labels={titleLabels} />
      <CWVMetricsComponent
        categoryGroups={categoryGroups}
        audits={audits}
        labels={titleLabels}
      />
      <CWVMetricsSummary data={data} labels={titleLabels} />
      {hideReport ? null : (
        <PageSpeedCategorySection
          data={data}
          labels={titleLabels}
          
        />
      )}
      <EntitiesTable
        entities={
          data.find((e) => e?.lighthouseResult?.entities)?.lighthouseResult
            ?.entities
        }
      />
    </fullPageScreenshotContext.Provider>
  );
}
