import { buildTimeAxisTicks } from "@/features/page-speed-insights/waterfall/waterfallData";
import {
  GuideChipLegend,
  GuideLabels,
  MilestoneLegend,
  type WaterfallGuide,
  type WaterfallMilestones,
} from "@/features/page-speed-insights/waterfall/guides";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import { cn } from "@/lib/utils";

type TimeAxisProps = {
  minStart: number;
  maxEnd: number;
  milestones?: WaterfallMilestones;
  guides?: WaterfallGuide[];
  /** When true, use overview-time-axis test id (timeline chrome). */
  overview?: boolean;
};

function TimeAxisTick({
  tick,
  index,
  minStart,
  maxEnd,
  className,
}: {
  tick: number;
  index: number;
  minStart: number;
  maxEnd: number;
  className?: string;
}) {
  const range = maxEnd - minStart;
  if (range <= 0) return null;
  const leftPct = ((tick - minStart) / range) * 100;
  if (leftPct < 0 || leftPct > 100) return null;
  return (
    <span
      className={cn(
        "absolute -translate-x-1/2 tabular-nums text-[9px] leading-none text-muted-foreground",
        !index && "pl-[3ch]",
        className,
      )}
      style={{ left: `${leftPct}%` }}
    >
      {formatMs(tick)}
    </span>
  );
}

export function TimeAxis({ minStart, maxEnd, milestones, guides, overview }: TimeAxisProps) {
  const desktopTicks = buildTimeAxisTicks(minStart, maxEnd, 5);
  const mobileTicks = buildTimeAxisTicks(minStart, maxEnd, 3);

  return (
    <div
      className="relative w-full min-w-0 space-y-0.5"
      data-testid={overview ? "overview-time-axis" : "waterfall-timeline"}
    >
      <div className="relative h-3 lg:hidden">
        {mobileTicks.map((tick, index) => (
          <TimeAxisTick key={tick} tick={tick} index={index} minStart={minStart} maxEnd={maxEnd} />
        ))}
      </div>
      <div className="relative hidden h-3 lg:block">
        {desktopTicks.map((tick, index) => (
          <TimeAxisTick key={tick} tick={tick} index={index} minStart={minStart} maxEnd={maxEnd} />
        ))}
      </div>
      {guides && guides.length > 0 ? (
        <>
          <div className="lg:hidden">
            <GuideChipLegend guides={guides} />
          </div>
          <div className="hidden lg:block">
            <GuideLabels minStart={minStart} maxEnd={maxEnd} guides={guides} />
          </div>
        </>
      ) : (
        <MilestoneLegend milestones={milestones} />
      )}
    </div>
  );
}

type TickGridOverlayProps = {
  minStart: number;
  maxEnd: number;
  overview?: boolean;
  /** Fewer ticks on narrow stacked layout. */
  tickCount?: number;
};

export function TickGridOverlay({
  minStart,
  maxEnd,
  overview,
  tickCount = 5,
}: TickGridOverlayProps) {
  const ticks = buildTimeAxisTicks(minStart, maxEnd, tickCount);
  const range = maxEnd - minStart;
  if (range <= 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      data-testid={overview ? "overview-tick-grid" : "waterfall-tick-grid"}
      aria-hidden
    >
      {ticks.map((tick) => {
        const leftPct = ((tick - minStart) / range) * 100;
        if (leftPct < 0 || leftPct > 100) return null;
        return (
          <div
            key={tick}
            className="absolute top-0 bottom-0 w-px bg-border/40"
            style={{ left: `${leftPct}%` }}
          />
        );
      })}
    </div>
  );
}
