"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { Button } from "@/components/ui/button";
import {
  causeKey,
  metricSectionKey,
  TIMELINE_KEY,
  TIMELINE_SHOTS_KEY,
  type OverviewModel,
} from "@/features/page-speed-insights/dashboard-view/overview/overviewModel";
import { useOverviewOpen } from "@/features/page-speed-insights/dashboard-view/overview/overviewOpen";
import {
  buildOverviewTimeline,
  type Lane,
  type LaneSegment,
  type OverviewTimeline as TimelineModel,
} from "@/features/page-speed-insights/dashboard-view/overview/overviewTimelineModel";
import { ratingFillClass } from "@/features/page-speed-insights/dashboard-view/overview/overviewTone";
import { collectTimelineSources } from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";
import {
  FilmstripViewer,
  type FilmstripViewerFrame,
} from "@/features/page-speed-insights/shared/FilmstripViewer";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import { ZOOM_TRIGGER_CLASS } from "@/features/page-speed-insights/shared/ZoomableImage";
import { LCP_PHASE_COLORS } from "@/features/page-speed-insights/shared/lcpPhaseColors";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { cn } from "@/lib/utils";

/** Bar fills avoid the rating hues, which the FCP / LCP markers use. */
const LANE_FILL: Record<Lane["id"], string> = {
  document: "bg-sky-500",
  "render-blocking": "bg-orange-400",
  lcp: "bg-violet-500",
  "main-thread": "bg-yellow-400",
  "layout-shifts": "bg-blue-400",
};

/** Label column and track share a wrapping row, so the label stacks above the track on a phone. */
const ROW_CLASS = "flex flex-wrap items-center gap-y-1";
const LABEL_CLASS = "w-36 shrink-0 pr-3 text-sm font-medium";
const TRACK_CLASS = "relative min-w-0 flex-[1_1_16rem]";

function percent(timeMs: number, endMs: number): string {
  return `${Math.min(100, Math.max(0, (timeMs / endMs) * 100))}%`;
}

function segmentFill(lane: Lane, segment: LaneSegment): string {
  return (segment.subpart && LCP_PHASE_COLORS[segment.subpart]) || LANE_FILL[lane.id];
}

function SegmentBar({
  lane,
  segment,
  endMs,
  selected,
  onPick,
}: {
  lane: Lane;
  segment: LaneSegment;
  endMs: number;
  selected: boolean;
  onPick?: () => void;
}) {
  const className = cn(
    "absolute inset-y-1 min-w-1.5 overflow-hidden rounded px-1.5 text-left text-xs leading-9 font-semibold whitespace-nowrap text-neutral-950",
    segmentFill(lane, segment),
    selected && "outline-2 outline-offset-2 outline-foreground",
  );
  const style = {
    left: percent(segment.startMs, endMs),
    width: percent(segment.endMs - segment.startMs, endMs),
  };

  if (!onPick) {
    return (
      <div className={className} style={style} title={segment.description}>
        {segment.label}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={cn(className, "cursor-pointer hover:brightness-110")}
      style={style}
      title={segment.description}
      aria-label={`${segment.description}. Open the cause.`}
      onClick={onPick}
    >
      {segment.label}
    </button>
  );
}

function Axis({ timeline }: { timeline: TimelineModel }) {
  return (
    <div className={ROW_CLASS} aria-hidden>
      <div className={LABEL_CLASS} />
      <div className={cn(TRACK_CLASS, "h-16")}>
        {timeline.marks.map((mark, index) => {
          const position = mark.timeMs / timeline.endMs;
          return (
            <div
              key={mark.id}
              className={cn(
                "absolute rounded px-1.5 py-0.5 font-mono text-xs font-semibold whitespace-nowrap text-neutral-950",
                ratingFillClass(mark.rating),
                // Stagger the labels so FCP and LCP stay readable when they are close.
                index === 0 ? "top-0" : "top-6",
                position > 0.85
                  ? "-translate-x-full"
                  : position > 0.15
                    ? "-translate-x-1/2"
                    : undefined,
              )}
              style={{ left: percent(mark.timeMs, timeline.endMs) }}
            >
              {mark.label} {formatMs(mark.timeMs)}
            </div>
          );
        })}
        {timeline.ticks.map((tick) => (
          <div
            key={tick}
            className="absolute bottom-0 pl-1 font-mono text-xs text-muted-foreground"
            style={{ left: percent(tick, timeline.endMs) }}
          >
            {formatMs(tick)}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenshotRow({ timeline, label }: { timeline: TimelineModel; label: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // The viewer steps through painted frames only; empty slots have nothing to enlarge.
  const painted = timeline.frames.filter(({ frame }) => frame);
  const viewerFrames: FilmstripViewerFrame[] = painted.map(({ timeMs, frame }) => ({
    timeMs,
    labels: [],
    panes: [{ label, src: frame!.data }],
  }));

  return (
    <div className={ROW_CLASS}>
      <div className={LABEL_CLASS}>Screenshots</div>
      <ol className={cn(TRACK_CLASS, "grid grid-cols-10 gap-1")}>
        {timeline.frames.map(({ timeMs, frame }) => (
          <li
            key={timeMs}
            className="h-12 overflow-hidden rounded-sm border bg-muted sm:h-24"
            title={`On screen at ${formatMs(timeMs)}`}
          >
            {frame ? (
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={`Open full screen: ${label} at ${formatMs(timeMs)}`}
                onClick={() => setOpenIndex(painted.findIndex((entry) => entry.timeMs === timeMs))}
                className={cn("block size-full", ZOOM_TRIGGER_CLASS)}
              >
                <img
                  alt={`${label} at ${formatMs(timeMs)}`}
                  src={frame.data}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover object-top"
                />
              </button>
            ) : (
              <span className="sr-only">Nothing painted at {formatMs(timeMs)}</span>
            )}
          </li>
        ))}
      </ol>
      <FilmstripViewer
        title={`${label} screenshots`}
        frames={viewerFrames}
        index={openIndex}
        onIndexChange={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />
    </div>
  );
}

/** The load as lanes on one time axis. Each bar opens the cause that explains it. */
export function OverviewTimeline({
  focus,
  model,
}: {
  focus: InsightsContextItem;
  model: OverviewModel;
}) {
  const open = useOverviewOpen();
  const timeline = useMemo(() => {
    const load = collectTimelineSources(focus);
    return load ? buildOverviewTimeline(load, new Set(model.homeOf.keys())) : null;
  }, [focus, model]);

  if (!timeline) return null;

  const shotsOpen = open?.isOpen(TIMELINE_SHOTS_KEY) ?? true;
  const hasFrames = timeline.frames.length > 0;

  return (
    <AccordionItem value={TIMELINE_KEY} className="print:border-0">
      <AccordionSectionTitleTrigger>
        <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3">
          <span>Load timeline</span>
          <span className="text-sm font-normal text-muted-foreground">{focus.label}</span>
        </span>
      </AccordionSectionTitleTrigger>
      <AccordionContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Each bar is a cause. Select one to open it below.
          </p>
          {open && hasFrames ? (
            <Button
              variant="outline"
              className="h-11"
              aria-pressed={shotsOpen}
              onClick={() => open.setOpen(TIMELINE_SHOTS_KEY, !shotsOpen)}
            >
              {shotsOpen ? "Hide screenshots" : "Show screenshots"}
            </Button>
          ) : null}
        </div>

        {hasFrames && shotsOpen ? <ScreenshotRow timeline={timeline} label={focus.label} /> : null}
        <Axis timeline={timeline} />

        {timeline.lanes.map((lane) => (
          <div key={lane.id} className={ROW_CLASS}>
            <div className={LABEL_CLASS}>{lane.name}</div>
            <div className={cn(TRACK_CLASS, "h-11 rounded bg-muted")}>
              {lane.segments.map((segment) => {
                const causeId = segment.causeId;
                const home = causeId ? model.homeOf.get(causeId) : undefined;
                return (
                  <SegmentBar
                    key={segment.key}
                    lane={lane}
                    segment={segment}
                    endMs={timeline.endMs}
                    selected={causeId != null && open?.highlighted === causeKey(causeId)}
                    onPick={
                      open && causeId && home
                        ? () =>
                            open.reveal(
                              [metricSectionKey(home), causeKey(causeId)],
                              causeKey(causeId),
                            )
                        : undefined
                    }
                  />
                );
              })}
              {timeline.marks.map((mark) => (
                <div
                  key={mark.id}
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-y-0 w-0.5",
                    ratingFillClass(mark.rating),
                  )}
                  style={{ left: percent(mark.timeMs, timeline.endMs) }}
                />
              ))}
            </div>
          </div>
        ))}
      </AccordionContent>
    </AccordionItem>
  );
}
