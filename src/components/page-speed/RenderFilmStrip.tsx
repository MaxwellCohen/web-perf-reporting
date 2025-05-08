import { AuditDetailFilmstrip } from '@/lib/schema';
import { Details } from '../ui/accordion';
import { Timeline } from './Timeline';
import { useContext } from 'react';
import { InsightsContext } from './PageSpeedContext';

export function RenderFilmStrip() {
  const items = useContext(InsightsContext);
  const timeLines = items
    .map((i, index) => {
      const timeline = i.item?.lighthouseResult?.audits?.[
        'screenshot-thumbnails'
      ]?.details as AuditDetailFilmstrip;
      if (timeline?.type !== 'filmstrip') return null;
      return <Timeline key={index} timeline={timeline} device={i.label} />;
    })
    .filter(Boolean); 
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
