import { AuditDetailFilmstrip } from '@/lib/schema';
import { Timeline } from '@/features/page-speed-insights/Timeline';
import { usePageSpeedItems } from '@/features/page-speed-insights/PageSpeedContext';
import { AccordionContent, AccordionItem } from '@/components/ui/accordion';
import { AccordionSectionTitleTrigger } from '@/components/ui/accordion-section-title-trigger';

export function RenderFilmStrip() {
  const items = usePageSpeedItems();
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
      <AccordionSectionTitleTrigger>Screenshots</AccordionSectionTitleTrigger>
      <AccordionContent>{timeLines}</AccordionContent>
    </AccordionItem>
  );
}
