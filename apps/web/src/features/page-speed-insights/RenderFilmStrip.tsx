import { Timeline } from "@/features/page-speed-insights/Timeline";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { filmstripTimelineFromItem } from "@/features/page-speed-insights/shared/filmstripMarkers";
import {
  getCompareRuns,
  pairByFormFactor,
} from "@/features/page-speed-insights/shared/compareRuns";
import { buildAlignedFilmstrip } from "@/features/page-speed-insights/shared/alignedFilmstrip";
import {
  FilmstripViewer,
  type FilmstripViewerFrame,
} from "@/features/page-speed-insights/shared/FilmstripViewer";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

function formatSeconds(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Runs stacked on one shared time axis so each column is the same moment. */
function AlignedFilmstrips({ items }: { items: InsightsContextItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const views = items
    .map((item) => ({ item, view: filmstripTimelineFromItem(item) }))
    .filter((entry) => entry.view !== null);
  if (!views.length) return null;

  const aligned = buildAlignedFilmstrip(
    views.map(({ view }) => ({ frames: view!.timeline.items, markers: view!.markers })),
  );
  if (!aligned.times.length) return null;

  const viewerFrames: FilmstripViewerFrame[] = aligned.times.map((time, i) => ({
    timeMs: time,
    labels: [...new Set(aligned.rows.flatMap((row) => row[i].labels))],
    panes: views.map(({ item, view }, rowIndex) => {
      const frame = aligned.rows[rowIndex][i].frame;
      return {
        label: view!.simulationLabel ? `${item.label} · ${view!.simulationLabel}` : item.label,
        src: frame?.data ?? null,
        frameTimeMs: frame?.timing,
      };
    }),
  }));

  return (
    <div className="overflow-x-auto pb-2" data-testid="filmstrip-aligned">
      <FilmstripViewer
        title="Screenshots compared"
        frames={viewerFrames}
        index={openIndex}
        onIndexChange={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />
      <table className="border-separate border-spacing-x-1 border-spacing-y-2">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-background" />
            {aligned.times.map((time) => (
              <th
                key={time}
                className="text-center text-xs font-medium tabular-nums text-muted-foreground"
              >
                {formatSeconds(time)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {views.map(({ item, view }, rowIndex) => (
            <tr key={item.label}>
              <th
                scope="row"
                className="sticky left-0 z-10 max-w-32 bg-background pr-2 text-left align-top text-xs font-medium"
              >
                {item.label}
                {view!.simulationLabel ? (
                  <div className="font-normal text-muted-foreground">{view!.simulationLabel}</div>
                ) : null}
              </th>
              {aligned.rows[rowIndex].map((cell, i) => (
                <td key={aligned.times[i]} className="align-top">
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => setOpenIndex(i)}
                    className={cn(
                      "block w-[72px] cursor-zoom-in rounded-md border-2 border-border p-1 transition-transform hover:scale-105 hover:border-foreground/40",
                      cell.changed && "outline outline-1 outline-offset-1 outline-foreground/60",
                    )}
                    data-changed={cell.changed || undefined}
                    title={cell.frame ? `frame at ${cell.frame.timing} ms` : "nothing painted yet"}
                  >
                    {cell.frame ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={`${item.label} at ${formatSeconds(aligned.times[i])}`}
                        width={64}
                        loading="lazy"
                        decoding="async"
                        src={cell.frame.data}
                      />
                    ) : (
                      // Hidden copy of the run's first frame sizes the box like its real frames
                      // (portrait on mobile, landscape on desktop).
                      <div className="w-16 bg-muted" data-testid="filmstrip-placeholder">
                        {view!.timeline.items[0]?.data ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt=""
                            aria-hidden
                            width={64}
                            className="invisible"
                            src={view!.timeline.items[0].data}
                          />
                        ) : (
                          <div className="aspect-[9/16]" />
                        )}
                      </div>
                    )}
                  </button>
                  <div className="mt-0.5 min-h-3 text-center text-[10px] font-medium uppercase tracking-wide">
                    {cell.labels.join(" · ")}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RenderFilmStrip() {
  const items = usePageSpeedItems();
  const compare = getCompareRuns(items);

  if (compare.mode === "compare") {
    const pairs = pairByFormFactor(items, compare.runs)
      .map((pair) => {
        const pairItems = [pair.a, pair.b].filter(Boolean) as InsightsContextItem[];
        if (!pairItems.some((item) => filmstripTimelineFromItem(item))) return null;
        return (
          <div
            key={pair.formFactor}
            className="min-w-0 space-y-2"
            data-testid="filmstrip-form-pair"
          >
            <p className="text-sm font-semibold">{pair.formFactor}</p>
            <AlignedFilmstrips items={pairItems} />
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
        <Timeline key={index} timeline={view.timeline} device={device} markers={view.markers} />
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
