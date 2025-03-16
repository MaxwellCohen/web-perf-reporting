'use client';

import {
  AuditDetailFilmstripSchema,
  AuditResultsRecord,
  Entities,
  PageSpeedInsights,
} from '@/lib/schema';
import { Accordion, Details } from '@/components/ui/accordion';

import { LoadingExperience } from './LoadingExperience';
import { EntitiesTable } from './EntitiesTable';
import { Timeline } from './Timeline';
import { CWVMetricsComponent } from './CWVMetricsComponent';
import { PageSpeedCategorySection } from './lh-categories/PageSpeedCategorySection';
import { fullPageScreenshotContext } from './PageSpeedContext';

export function PageSpeedInsightsDashboard({
  desktopData,
  mobileData,
}: {
  desktopData?: PageSpeedInsights | null;
  mobileData?: PageSpeedInsights | null;
}) {
  const desktopEntities: Entities | undefined =
    desktopData?.lighthouseResult?.entities;
  const desktopAuditRecords: AuditResultsRecord | undefined =
    desktopData?.lighthouseResult?.audits;
  const desktopCategories = desktopData?.lighthouseResult?.categories;
  const desktopCategoryGroups = desktopData?.lighthouseResult?.categoryGroups;
  const mobileAuditRecords: AuditResultsRecord | undefined =
    mobileData?.lighthouseResult?.audits;
  const mobileCategoryGroups = mobileData?.lighthouseResult?.categoryGroups;
  const mobileCategories = mobileData?.lighthouseResult?.categories;
  const desktopFullPageScreenshot =
    desktopData?.lighthouseResult.fullPageScreenshot || null;
  const mobileFullPageScreenshot =
    mobileData?.lighthouseResult.fullPageScreenshot || null;

  return (
    <fullPageScreenshotContext.Provider
      value={{
        desktopFullPageScreenshot,
        mobileFullPageScreenshot,
      }}
    >
      <Accordion
        type="multiple"
        defaultValue={[
          'page-loading-experience',
          'origin-loading-experience',
          'screenshot',
          'entities',
          'audits',
          ...Object.keys(desktopCategories || {}),
        ]}
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
          desktopCategoryGroups={desktopCategoryGroups}
          desktopAudits={desktopAuditRecords}
          mobileCategoryGroups={mobileCategoryGroups}
          mobileAudits={mobileAuditRecords}
        />
        <RenderPageSpeedInsights
          desktopData={desktopData}
          mobileData={mobileData}
        />
        <PageSpeedCategorySection
          desktopCategories={desktopCategories}
          mobileCategories={mobileCategories}
          desktopAuditRecords={desktopAuditRecords}
          mobileAuditRecords={mobileAuditRecords}
        />
        <EntitiesTable entities={desktopEntities} />
      </Accordion>
    </fullPageScreenshotContext.Provider>
  );
}

function RenderPageSpeedInsights({
  desktopData,
  mobileData,
}: {
  desktopData?: PageSpeedInsights | null;
  mobileData?: PageSpeedInsights | null;
}) {
  const DesktopTimeline = AuditDetailFilmstripSchema.safeParse(
    desktopData?.lighthouseResult?.audits?.['screenshot-thumbnails'].details,
  ).data;
  const MobileTimeline = AuditDetailFilmstripSchema.safeParse(
    mobileData?.lighthouseResult?.audits?.['screenshot-thumbnails'].details,
  ).data;

  if (!DesktopTimeline || !MobileTimeline) return null;

  return (
    <Details className="flex flex-col flex-wrap gap-2">
      <summary className="flex flex-col gap-2 overflow-auto">
        <h3 className="text-lg font-bold">Screenshots</h3>
      </summary>
      {MobileTimeline ? (
        <Timeline timeline={MobileTimeline} device="Mobile" />
      ) : null}
      {DesktopTimeline ? (
        <Timeline timeline={DesktopTimeline} device="Desktop" />
      ) : null}
    </Details>
  );
}
