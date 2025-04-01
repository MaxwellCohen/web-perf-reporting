'use client';
import { PageSpeedInsights } from '@/lib/schema';
import { LoadingExperience } from './LoadingExperience';
import { EntitiesTable } from './EntitiesTable';
import { CWVMetricsComponent } from './CWVMetricsComponent';
import { PageSpeedCategorySection } from './lh-categories/PageSpeedCategorySection';
import { fullPageScreenshotContext } from './PageSpeedContext';
import { useFetchPageSpeedData } from './useFetchPageSpeedData';
import { RenderPageSpeedInsights } from './RenderPageSpeedInsights';

export function PageSpeedInsightsDashboard({
  mobileDataPrams,
  desktopDataPrams,
}: {
  mobileDataPrams?: PageSpeedInsights;
  desktopDataPrams?: PageSpeedInsights;
}) {
  const[mobileData, desktopData]= useFetchPageSpeedData([mobileDataPrams, desktopDataPrams]);
  if (!desktopData && !mobileData) {
    return <div>Loading...</div>;
  }

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
        Report for{' '}
        {new Date(
          desktopData?.analysisUTCTimestamp ||
            mobileData?.analysisUTCTimestamp ||
            0,
        ).toLocaleDateString()}
      </h2>
      <LoadingExperience
        title="Page Loading Experience"
        experienceDesktop={desktopData?.loadingExperience}
        experienceMobile={mobileData?.loadingExperience}
      />
      <LoadingExperience
        title="Origin Loading Experience"
        experienceDesktop={desktopData?.originLoadingExperience}
        experienceMobile={mobileData?.originLoadingExperience}
      />
      <CWVMetricsComponent
        desktopCategoryGroups={desktopData?.lighthouseResult?.categoryGroups}
        desktopAudits={desktopData?.lighthouseResult?.audits}
        mobileCategoryGroups={mobileData?.lighthouseResult?.categoryGroups}
        mobileAudits={mobileData?.lighthouseResult?.audits}
      />
      <RenderPageSpeedInsights
        desktopData={desktopData}
        mobileData={mobileData}
      />
      <PageSpeedCategorySection
        desktopCategories={desktopData?.lighthouseResult?.categories}
        mobileCategories={mobileData?.lighthouseResult?.categories}
        desktopAuditRecords={desktopData?.lighthouseResult?.audits}
        mobileAuditRecords={mobileData?.lighthouseResult?.audits}
      />
      <EntitiesTable entities={desktopData?.lighthouseResult?.entities || mobileData?.lighthouseResult?.entities} />
    </fullPageScreenshotContext.Provider>
  );
}
