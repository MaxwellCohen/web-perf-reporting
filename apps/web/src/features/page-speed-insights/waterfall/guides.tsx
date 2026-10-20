import { formatMs } from "@/features/page-speed-insights/shared/format";
import type { Rating, TimelineEvent } from "@/features/page-speed-insights/page-load-timeline/types";
import { isIntervalMoment } from "@/features/page-speed-insights/page-load-timeline/clusterOverlappingMoments";
import { cn } from "@/lib/utils";

export type WaterfallGuide = {
  id: string;
  label: string;
  timeMs: number;
  title: string;
  kind: "cwv" | "lifecycle";
  rating?: Rating;
};

/** Lifecycle / CWV points that get full-height vertical guides. */
const OVERVIEW_GUIDE_IDS = new Set([
  "nav-start",
  "req-ttfb",
  "render-fp",
  "render-fcp",
  "parse-dcl",
  "sub-lcp",
  "sub-load",
  "sub-last-visual",
  "after-tti",
]);

const OVERVIEW_GUIDE_LABEL: Record<string, string> = {
  "nav-start": "Nav",
  "req-ttfb": "TTFB",
  "render-fp": "FP",
  "render-fcp": "FCP",
  "parse-dcl": "DCL",
  "sub-lcp": "LCP",
  "sub-load": "Load",
  "sub-last-visual": "LVC",
  "after-tti": "TTI",
};

function isOverviewGuideMarker(event: TimelineEvent): boolean {
  if (isIntervalMoment(event)) return false;
  return event.kind === "cwv" || OVERVIEW_GUIDE_IDS.has(event.id);
}

export function buildGuidesFromEvents(events: TimelineEvent[]): WaterfallGuide[] {
  return events.filter(isOverviewGuideMarker).map((event) => ({
    id: event.id,
    label: OVERVIEW_GUIDE_LABEL[event.id] ?? event.title,
    timeMs: event.timeMs,
    title: event.title,
    kind: event.kind === "cwv" ? ("cwv" as const) : ("lifecycle" as const),
    rating: event.rating,
  }));
}

export function filterGuidesByTimeRange(
  guides: WaterfallGuide[],
  startMs: number,
  endMs: number,
): WaterfallGuide[] {
  return guides.filter((guide) => guide.timeMs >= startMs && guide.timeMs <= endMs);
}

function guideLineClass(guide: WaterfallGuide): string {
  if (guide.kind === "cwv") {
    if (guide.rating === "good") return "bg-emerald-500/65";
    if (guide.rating === "poor") return "bg-rose-500/65";
    return "bg-amber-500/65";
  }
  return "bg-sky-500/50";
}

function guideLabelClass(guide: WaterfallGuide): string {
  if (guide.kind === "cwv") {
    if (guide.rating === "good") return "text-emerald-700 dark:text-emerald-300";
    if (guide.rating === "poor") return "text-rose-700 dark:text-rose-300";
    return "text-amber-800 dark:text-amber-300";
  }
  return "text-sky-700 dark:text-sky-300";
}

/** Stagger labels that sit within ~6% of each other so they don't collide. */
function guideLabelLanes(
  guides: WaterfallGuide[],
  startMs: number,
  windowMs: number,
): number[] {
  const lanes: number[] = [];
  const occupied: { left: number; lane: number }[] = [];
  const minGapPct = 6;
  for (const guide of guides) {
    const left = ((guide.timeMs - startMs) / windowMs) * 100;
    let lane = 0;
    while (occupied.some((o) => o.lane === lane && Math.abs(o.left - left) < minGapPct)) {
      lane += 1;
    }
    occupied.push({ left, lane });
    lanes.push(lane);
  }
  return lanes;
}

type GuideOverlayProps = {
  minStart: number;
  maxEnd: number;
  guides: WaterfallGuide[];
  /** Timeline overview uses overview-guide-lines; standalone waterfall uses the legacy id. */
  testId?: string;
};

export function GuideOverlay({
  minStart,
  maxEnd,
  guides,
  testId = "waterfall-milestone-overlay",
}: GuideOverlayProps) {
  const range = maxEnd - minStart;
  if (!guides.length || range <= 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-1"
      data-testid={testId}
      aria-hidden
    >
      {guides.map((guide) => {
        const leftPct = ((guide.timeMs - minStart) / range) * 100;
        if (leftPct < 0 || leftPct > 100) return null;
        return (
          <div
            key={guide.id}
            className={cn("absolute top-0 bottom-0 w-px -translate-x-1/2", guideLineClass(guide))}
            style={{ left: `${leftPct}%` }}
            data-guide={guide.id}
            title={`${guide.label}: ${formatMs(guide.timeMs)}`}
          />
        );
      })}
    </div>
  );
}

export function GuideLabels({ minStart, maxEnd, guides }: GuideOverlayProps) {
  const range = maxEnd - minStart;
  if (!guides.length || range <= 0) return null;
  const lanes = guideLabelLanes(guides, minStart, range);
  const rows = Math.max(1, ...lanes.map((lane) => lane + 1));

  const laneHeightRem = 0.625;

  return (
    <div
      className="relative"
      style={{ height: `${rows * laneHeightRem}rem` }}
      data-testid="overview-guide-labels"
    >
      {guides.map((guide, index) => {
        const left = ((guide.timeMs - minStart) / range) * 100;
        const lane = lanes[index] ?? 0;
        const full = `${guide.label}: ${formatMs(guide.timeMs)}`;
        return (
          <span
            key={`label-${guide.id}`}
            title={full}
            className={cn(
              "absolute left-0 text-[8px] font-semibold leading-none -translate-x-1/2",
              guideLabelClass(guide),
              left < 4 && "translate-x-0",
              left > 96 && "-translate-x-full",
            )}
            style={{ left: `${left}%`, top: `${lane * laneHeightRem}rem` }}
            data-guide-label={guide.id}
          >
            {guide.label}
          </span>
        );
      })}
    </div>
  );
}

/** Wrap legend for narrow viewports where absolute guide labels collide. */
export function GuideChipLegend({ guides }: { guides: WaterfallGuide[] }) {
  if (!guides.length) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-0.5"
      data-testid="overview-guide-labels"
    >
      {guides.map((guide) => (
        <span
          key={guide.id}
          title={`${guide.title}: ${formatMs(guide.timeMs)}`}
          className={cn(
            "inline-flex items-center gap-1 text-[9px] font-semibold leading-none tabular-nums",
            guideLabelClass(guide),
          )}
          data-guide-label={guide.id}
        >
          <span
            className={cn("h-1.5 w-1.5 shrink-0 rounded-sm", guideLineClass(guide))}
            aria-hidden
          />
          {guide.label}
          <span className="font-normal text-muted-foreground">{formatMs(guide.timeMs)}</span>
        </span>
      ))}
    </div>
  );
}

/** Legacy FCP/LCP/DCL milestones for callers that only have metric numbers. */
export type WaterfallMilestones = {
  fcp?: number;
  lcp?: number;
  domContentLoaded?: number;
};

export function guidesFromMilestones(milestones?: WaterfallMilestones): WaterfallGuide[] {
  if (!milestones) return [];
  const guides: WaterfallGuide[] = [];
  if (milestones.fcp != null && milestones.fcp > 0) {
    guides.push({
      id: "render-fcp",
      label: "FCP",
      timeMs: milestones.fcp,
      title: "First Contentful Paint",
      kind: "cwv",
    });
  }
  if (milestones.lcp != null && milestones.lcp > 0) {
    guides.push({
      id: "sub-lcp",
      label: "LCP",
      timeMs: milestones.lcp,
      title: "Largest Contentful Paint",
      kind: "cwv",
    });
  }
  if (milestones.domContentLoaded != null && milestones.domContentLoaded > 0) {
    guides.push({
      id: "parse-dcl",
      label: "DCL",
      timeMs: milestones.domContentLoaded,
      title: "DOM Content Loaded",
      kind: "lifecycle",
    });
  }
  return guides;
}

export function getMilestoneItems(milestones?: WaterfallMilestones) {
  return guidesFromMilestones(milestones).map((guide) => ({
    key: guide.id === "render-fcp" ? "fcp" : guide.id === "sub-lcp" ? "lcp" : "dcl",
    label: guide.label,
    value: guide.timeMs,
  }));
}

export function MilestoneOverlay({
  minStart,
  maxEnd,
  milestones,
}: {
  minStart: number;
  maxEnd: number;
  milestones?: WaterfallMilestones;
}) {
  return (
    <GuideOverlay minStart={minStart} maxEnd={maxEnd} guides={guidesFromMilestones(milestones)} />
  );
}

export function MilestoneLegend({ milestones }: { milestones?: WaterfallMilestones }) {
  const items = getMilestoneItems(milestones);
  if (!items.length) return null;

  const DOT: Record<string, string> = {
    fcp: "bg-emerald-500",
    lcp: "bg-amber-500",
    dcl: "bg-sky-500",
  };

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-0.5"
      data-testid="waterfall-milestone-legend"
    >
      {items.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"
          title={`${item.label}: ${formatMs(item.value)}`}
        >
          <span
            className={cn("h-2 w-2 shrink-0 rounded-full", DOT[item.key] ?? "bg-primary")}
          />
          {item.label}
          <span className="tabular-nums font-normal">{formatMs(item.value)}</span>
        </span>
      ))}
    </div>
  );
}
