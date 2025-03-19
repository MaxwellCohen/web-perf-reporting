'use client';
import { PageSpeedInsights, AuditDetailFilmstripSchema } from '@/lib/schema';
import { Details } from '../ui/accordion';
import { Timeline } from './Timeline';

export function RenderPageSpeedInsights({
  desktopData, mobileData,
}: {
  desktopData?: PageSpeedInsights | null;
  mobileData?: PageSpeedInsights | null;
}) {
  const DesktopTimeline = AuditDetailFilmstripSchema.safeParse(
    desktopData?.lighthouseResult?.audits?.['screenshot-thumbnails'].details
  ).data;
  const MobileTimeline = AuditDetailFilmstripSchema.safeParse(
    mobileData?.lighthouseResult?.audits?.['screenshot-thumbnails'].details
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
