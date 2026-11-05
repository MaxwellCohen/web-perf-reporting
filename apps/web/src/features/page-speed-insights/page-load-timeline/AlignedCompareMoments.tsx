import { formatMs } from "@/features/page-speed-insights/shared/format";
import { buildAlignedCompareRows, type AlignedCompareRow } from "./buildAlignedCompareRows";
import { Moment } from "./Moment";
import { momentAnchorId } from "./MomentRow";
import type { TimelineEvent } from "./types";

function CompareMoment({
  moment,
  axisEnd,
  deviceLabel,
}: {
  moment: TimelineEvent;
  axisEnd: number;
  deviceLabel: string;
}) {
  return (
    <Moment.Root
      moment={moment}
      axisEnd={axisEnd}
      deviceLabel={deviceLabel}
      className="px-2 py-2 sm:py-3"
    >
      <Moment.Body className="space-y-1.5 sm:space-y-2">
        <Moment.Header>
          <Moment.Title className="text-xs sm:text-base" />
          <Moment.Time />
          <Moment.Rating />
          <Moment.BlockingBadges />
          <Moment.Status />
        </Moment.Header>
        <Moment.Detail className="line-clamp-3 text-xs sm:line-clamp-none sm:text-sm" />
        <Moment.Requests />
        <Moment.Notes />
        <Moment.LcpBreakdown />
      </Moment.Body>
      <Moment.LcpElement />
      <Moment.Screenshot />
    </Moment.Root>
  );
}

function CompareRowTime({ row }: { row: AlignedCompareRow }) {
  const { leftTimeMs, rightTimeMs } = row;
  if (leftTimeMs == null || rightTimeMs == null || leftTimeMs === rightTimeMs) {
    return (
      <span className="rounded-md bg-muted px-2 py-1 text-center text-xs font-semibold tabular-nums text-foreground">
        {formatMs(row.timeMs)}
      </span>
    );
  }
  const delta = rightTimeMs - leftTimeMs;
  return (
    <span className="flex flex-col items-center gap-0.5 rounded-md bg-muted px-2 py-1 text-center text-xs font-semibold tabular-nums text-foreground">
      <span>← {formatMs(leftTimeMs)}</span>
      <span>{formatMs(rightTimeMs)} →</span>
      <span className="text-[10px] font-medium text-muted-foreground">
        {delta > 0 ? "+" : "−"}
        {formatMs(Math.abs(delta))}
      </span>
    </span>
  );
}

function CompareColumn({
  moments,
  side,
  keyPrefix,
  axisEndMs,
}: {
  moments: TimelineEvent[];
  side: { label: string; idPrefix: string };
  keyPrefix: string;
  axisEndMs: number;
}) {
  return (
    <div className="min-w-0 space-y-2">
      {moments.map((moment) => (
        <div
          key={`${keyPrefix}-${moment.phaseId}-${moment.id}`}
          id={momentAnchorId(moment.id, side.idPrefix)}
        >
          <CompareMoment moment={moment} axisEnd={axisEndMs} deviceLabel={side.label} />
        </div>
      ))}
    </div>
  );
}

export function AlignedCompareMoments({
  left,
  right,
  axisEndMs,
}: {
  left: { label: string; events: TimelineEvent[]; idPrefix: string };
  right: { label: string; events: TimelineEvent[]; idPrefix: string };
  axisEndMs: number;
}) {
  const rows = buildAlignedCompareRows(left.events, right.events);

  return (
    <div className="relative" data-testid="timeline-aligned-moments">
      <div
        className="mb-2 grid grid-cols-2 items-end sm:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] gap-2 border-b border-border/70 pb-2 text-xs font-semibold text-muted-foreground"
        aria-hidden
      >
        <p className="truncate">{left.label}</p>
        <p className="hidden text-center tabular-nums sm:block">Time</p>
        <p className="truncate text-right">{right.label}</p>
      </div>
      <ol className="relative m-0 list-none space-y-3 p-0">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-border/60 sm:hidden"
        />
        {rows.map((row, rowIndex) => (
          <li
            key={rowIndex}
            className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] sm:items-start sm:gap-2"
            data-testid="timeline-aligned-row"
            data-time-ms={row.timeMs}
          >
            <CompareColumn moments={row.left} side={left} keyPrefix="l" axisEndMs={axisEndMs} />
            <div className="relative z-10 order-first col-span-2 flex items-center justify-center sm:order-none sm:col-span-1 sm:pt-3">
              <CompareRowTime row={row} />
            </div>
            <CompareColumn moments={row.right} side={right} keyPrefix="r" axisEndMs={axisEndMs} />
          </li>
        ))}
      </ol>
    </div>
  );
}
