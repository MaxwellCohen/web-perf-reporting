'use client';

import {
  AuditDetailFilmstripSchema,
  AuditResultsRecord,
  Entities,
  PageSpeedInsights,
} from '@/lib/schema';
import { Details } from '@/components/ui/accordion';

import { LoadingExperience } from './LoadingExperience';
import { EntitiesTable } from './EntitiesTable';
import { Timeline } from './Timeline';
import { CWVMetricsComponent } from './CWVMetricsComponent';
import { PageSpeedCategorySection } from './lh-categories/PageSpeedCategorySection';
import { fullPageScreenshotContext } from './PageSpeedContext';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';

const fetcher = async (url: string) => {
  const res = await fetch(url);

  // If the status code is not in the range 200-299,
  // we still try to parse and throw it.
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }

  return res.json();
};

export function PageSpeedInsightsDashboard() {
  const searchParams = useSearchParams();
  const url = encodeURI(searchParams?.get('url') ?? '');
  const desktopSearchPrams = new URLSearchParams({
    testURL: url as string,
    formFactor: 'DESKTOP',
  }).toString();
  const mobileSearchPrams = new URLSearchParams({
    testURL: url as string,
    formFactor: 'MOBILE',
  }).toString();

  const { data: desktopData } = useSWR<PageSpeedInsights>(
    `/api/pagespeed?${desktopSearchPrams}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    },
  );

  const { data: mobileData } = useSWR<PageSpeedInsights>(
    `/api/pagespeed?${mobileSearchPrams}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    },
  );

  if (!desktopData && !mobileData) {
    return <div>Loading...</div>;
  }

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
