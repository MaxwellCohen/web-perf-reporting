import { AuditDetailFilmstrip } from '@/lib/schema';
import { Timeline } from '@/components/page-speed/Timeline';
import { useContext } from 'react';
import { InsightsContext } from '@/components/page-speed/PageSpeedContext';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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
    <AccordionItem
      value={'Screenshots'}
    >
      <AccordionTrigger>
        <div className="text-lg font-bold group-hover:underline">Screenshots</div>
      </AccordionTrigger>
      <AccordionContent>{timeLines}</AccordionContent>
    </AccordionItem>
  );
}
