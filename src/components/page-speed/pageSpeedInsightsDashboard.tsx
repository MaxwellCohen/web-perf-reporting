'use client';

import {
  AuditDetailFilmstripSchema,
  AuditResult,
  Entities,
  PageSpeedInsights,
} from '@/lib/schema';
import { Accordion } from '@/components/ui/accordion';

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
  const DesktopTimeline = AuditDetailFilmstripSchema.safeParse(
    desktopData?.lighthouseResult?.audits?.['screenshot-thumbnails'].details,
  ).data;
  const MobileTimeline = AuditDetailFilmstripSchema.safeParse(
    mobileData?.lighthouseResult?.audits?.['screenshot-thumbnails'].details,
  ).data;

  const desktopEntities: Entities | undefined =
    desktopData?.lighthouseResult?.entities;
  const desktopAuditRecords: AuditResult | undefined =
    desktopData?.lighthouseResult?.audits;
  const desktopCategories = desktopData?.lighthouseResult?.categories;
  const desktopCategoryGroups = desktopData?.lighthouseResult?.categoryGroups;
  const mobileAuditRecords: AuditResult | undefined =
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
        style={
          {
            '--desktopFullPageScreenshot': `url(${mobileFullPageScreenshot?.screenshot.data})`,
            '--mobileFullPageScreenshot': `url(${mobileFullPageScreenshot?.screenshot.data})`,
          } as React.CSSProperties
        }
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
        <div className="screen:hidden print:break-before-page"></div>
        <LoadingExperience
          title="Origin Loading Experience"
          experienceDesktop={desktopData?.originLoadingExperience}
          experienceMobile={mobileData?.originLoadingExperience}
        />

        <div className="grid grid-rows-[auto_1fr] print:break-before-page">
          <CWVMetricsComponent
            desktopCategoryGroups={desktopCategoryGroups}
            desktopAudits={desktopAuditRecords}
            mobileCategoryGroups={mobileCategoryGroups}
            mobileAudits={mobileAuditRecords}
          />
          <div className="flex flex-row flex-wrap gap-2">
            <Timeline timeline={MobileTimeline} device="Mobile" />
            <Timeline timeline={DesktopTimeline} device="Desktop" />
          </div>
        </div>

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
