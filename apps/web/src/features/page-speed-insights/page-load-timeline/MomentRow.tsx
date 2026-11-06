import { formatMs } from "@/features/page-speed-insights/shared/format";
import { cn } from "@/lib/cn";
import { Moment } from "./Moment";
import type { MarkerKind, Rating, TimelineEvent } from "./types";

function markerDotClass(kind: MarkerKind, rating?: Rating): string {
  if (kind === "blocking") return "bg-rose-500";
  if (kind === "potentially-blocking") return "bg-amber-500";
  if (kind === "cwv") {
    if (rating === "good") return "bg-emerald-500";
    if (rating === "poor") return "bg-rose-500";
    return "bg-amber-500";
  }
  if (kind === "fact") return "bg-muted-foreground/50";
  return "bg-sky-500";
}

function PhaseHeader({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-20 mb-3 border-b border-border/80 bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
    </div>
  );
}

function MomentRail({ moment }: { moment: TimelineEvent }) {
  const muted = moment.status === "not-recorded";
  return (
    <div className="relative z-10 flex flex-col items-center pt-0.5">
      {moment.startMs != null && moment.startMs !== moment.timeMs ? (
        <span className="max-w-full truncate px-0.5 text-center text-xs tabular-nums text-muted-foreground">
          {formatMs(moment.startMs)} →
        </span>
      ) : null}
      <span
        className={cn(
          "max-w-full px-0.5 text-center text-xs font-semibold leading-tight tabular-nums sm:text-sm",
          muted ? "text-muted-foreground/70" : "text-foreground",
        )}
      >
        {formatMs(moment.timeMs)}
      </span>
      {moment.endMs != null && moment.endMs !== moment.timeMs ? (
        <span className="max-w-full truncate px-0.5 text-center text-xs tabular-nums text-muted-foreground">
          → {formatMs(moment.endMs)}
        </span>
      ) : null}
      <span
        className={cn(
          "mt-1 size-2.5 shrink-0 rounded-full ring-2 ring-background",
          markerDotClass(moment.kind, moment.rating),
        )}
        aria-hidden
      />
    </div>
  );
}

/** Slug for namespacing moment anchors when dual timelines mount. */
export function momentIdPrefixFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function momentAnchorId(id: string, idPrefix?: string): string {
  return idPrefix ? `timeline-moment-${idPrefix}-${id}` : `timeline-moment-${id}`;
}

export function MomentRow({
  moment,
  axisEnd,
  deviceLabel,
  showPhaseHeader,
  idPrefix,
}: {
  moment: TimelineEvent;
  axisEnd: number;
  deviceLabel: string;
  showPhaseHeader: boolean;
  idPrefix?: string;
}) {
  return (
    <li className="relative scroll-mt-28" id={momentAnchorId(moment.id, idPrefix)}>
      {showPhaseHeader ? <PhaseHeader title={moment.phaseTitle} /> : null}

      <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-3 sm:grid-cols-[5.75rem_minmax(0,1fr)]">
        <MomentRail moment={moment} />
        <div className="mb-4 min-w-0">
          <Moment.Root moment={moment} axisEnd={axisEnd} deviceLabel={deviceLabel}>
            <Moment.Body>
              <Moment.Header>
                <Moment.Title />
                <Moment.Rating />
                <Moment.BlockingBadges />
                <Moment.Status />
              </Moment.Header>
              <Moment.Detail />
              <Moment.Requests />
              <Moment.Notes />
              <Moment.LcpBreakdown />
            </Moment.Body>
            <Moment.LcpElement />
            <Moment.Screenshot />
          </Moment.Root>
        </div>
      </div>
    </li>
  );
}
