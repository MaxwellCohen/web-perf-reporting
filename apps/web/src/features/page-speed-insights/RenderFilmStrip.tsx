import { Timeline } from "@/features/page-speed-insights/Timeline";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { filmstripTimelineFromItem } from "@/features/page-speed-insights/shared/filmstripMarkers";

export function RenderFilmStrip() {
  const items = usePageSpeedItems();
  const timeLines = items
    .map((item, index) => {
      const view = filmstripTimelineFromItem(item);
      if (!view) return null;
      const device = view.simulationLabel
        ? `${view.device} · ${view.simulationLabel}`
        : view.device;
      return (
        <Timeline
          key={index}
          timeline={view.timeline}
          device={device}
          markers={view.markers}
        />
      );
    })
    .filter(Boolean);
  if (!timeLines.length) return null;

  return (
    <AccordionItem value={"Screenshots"}>
      <AccordionSectionTitleTrigger>Screenshots</AccordionSectionTitleTrigger>
      <AccordionContent>{timeLines}</AccordionContent>
    </AccordionItem>
  );
}
