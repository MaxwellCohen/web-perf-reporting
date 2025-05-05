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
}: {
  data: NullablePageSpeedInsights[];
  labels: string[];
}) {
  const [desktopData, mobileData] = data || [];

  const categoryGroups = data.map((d) => d?.lighthouseResult?.categoryGroups ?? null);
  const audits = data.map((d) => d?.lighthouseResult?.audits ??null);

  const titleLabels = labels;
  const timestamp = data.find((d) => d?.analysisUTCTimestamp)?.analysisUTCTimestamp
  return (
    <fullPageScreenshotContext.Provider
      value={{
        desktopFullPageScreenshot:
          desktopData?.lighthouseResult?.fullPageScreenshot,
        mobileFullPageScreenshot:
          mobileData?.lighthouseResult.fullPageScreenshot,
      }}
    >
      <h2 className="text-center text-2xl font-bold">
        {`Report for ${timestamp ? new Date(
          timestamp|| 0,
        ).toLocaleDateString() : ''}`}
      </h2>
      <LoadingExperience
        title="Page Loading Experience"
        experiences={data.map((d) => d?.loadingExperience || null)}
        labels={titleLabels}
      />
      <LoadingExperience
        title="Origin Loading Experience"
        experiences={data.map((d) => d?.originLoadingExperience || null)}
        labels={titleLabels}
      />
      <CWVMetricsComponent
        categoryGroups={categoryGroups}
        audits={audits}
        labels={titleLabels}
      />
      <CWVMetricsSummary data={data} labels={titleLabels} />
      <RenderFilmStrip data={data} labels={titleLabels} />
      <PageSpeedCategorySection
        desktopCategories={desktopData?.lighthouseResult?.categories}
        mobileCategories={mobileData?.lighthouseResult?.categories}
        desktopAuditRecords={desktopData?.lighthouseResult?.audits}
        mobileAuditRecords={mobileData?.lighthouseResult?.audits}
      />
      <EntitiesTable
        entities={
          desktopData?.lighthouseResult?.entities ||
          mobileData?.lighthouseResult?.entities
        }
      />
    </fullPageScreenshotContext.Provider>
  );
}
