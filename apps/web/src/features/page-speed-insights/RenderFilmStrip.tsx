import { Timeline } from "@/features/page-speed-insights/Timeline";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { filmstripTimelineFromItem } from "@/features/page-speed-insights/shared/filmstripMarkers";
import {
  getCompareRuns,
  pairByFormFactor,
} from "@/features/page-speed-insights/shared/compareRuns";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

function FilmstripTimeline({ item }: { item: InsightsContextItem }) {
  const view = filmstripTimelineFromItem(item);
  if (!view) return null;
  const device = view.simulationLabel
    ? `${view.device} · ${view.simulationLabel}`
    : view.device;
  return <Timeline timeline={view.timeline} device={device} markers={view.markers} />;
}

export function RenderFilmStrip() {
  const items = usePageSpeedItems();
  const compare = getCompareRuns(items);

  if (compare.mode === "compare") {
    const pairs = pairByFormFactor(items, compare.runs)
      .map((pair) => {
        const pairItems = [pair.a, pair.b].filter(Boolean) as InsightsContextItem[];
        const strips = pairItems
          .map((item) => {
            if (!filmstripTimelineFromItem(item)) return null;
            return (
              <div key={item.label} className="min-w-0 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                <FilmstripTimeline item={item} />
              </div>
            );
          })
          .filter(Boolean);
        if (!strips.length) return null;
        return (
          <div key={pair.formFactor} className="min-w-0 space-y-2" data-testid="filmstrip-form-pair">
            <p className="text-sm font-semibold">{pair.formFactor}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{strips}</div>
          </div>
        );
      })
      .filter(Boolean);

    if (!pairs.length) return null;

    return (
      <AccordionItem value={"Screenshots"}>
        <AccordionSectionTitleTrigger>Screenshots</AccordionSectionTitleTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-4" data-testid="filmstrip-compare">
            {pairs}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
  }

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
