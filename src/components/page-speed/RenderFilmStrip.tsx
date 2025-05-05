import {  AuditDetailFilmstripSchema, NullablePageSpeedInsights } from '@/lib/schema';
import { Details } from '../ui/accordion';
import { Timeline } from './Timeline';

export function RenderFilmStrip({
  data,
  labels,
}: {
  data: NullablePageSpeedInsights[];
  labels: string[];
}) {
  const timeLines = data.map((item, index) => {
    const timeline = AuditDetailFilmstripSchema.safeParse(
      item?.lighthouseResult?.audits?.['screenshot-thumbnails'].details
    ).data;
    if (!timeline) return null;
    return (
      <Timeline key={index} timeline={timeline} device={labels[index]} />
    )
  }).filter(Boolean);
  if (!timeLines.length) return null;

  return (
    <Details className="flex flex-col flex-wrap gap-2">
      <summary className="flex flex-col gap-2 overflow-auto">
        <h3 className="text-lg font-bold">Screenshots</h3>
      </summary>
      {timeLines}
    </Details>
  );
}
