"use client";
/* eslint-disable @next/next/no-img-element */

import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { patchDashboardSearch } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { useDashboardSearchState } from "@/features/page-speed-insights/dashboard-view/useDashboardSearch";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import { ResourceUrlCell } from "@/features/page-speed-insights/shared/ResourceUrlCell";
import {
  RenderBlockingBadge,
  UnifiedWaterfall,
  waterfallRowFromLcpSegments,
  waterfallRowFromTimelineBar,
  WaterfallBarTrack,
  type WaterfallRowKind,
} from "@/features/page-speed-insights/waterfall";
import { cn } from "@/lib/cn";
import { buildPageLoadTimelineBundles } from "./buildPageLoadTimeline";
import {
  TASK_FILTERS,
  allTaskFilters,
  availableTaskFilters,
  filterTimelineMoments,
  TASK_FILTER_LABEL,
  type TaskFilterId,
  type TaskFilterSelection,
} from "./filterTimelineMoments";
import { timelineToMarkdown } from "./timelineToMarkdown";
import type {
  MarkerKind,
  PageLoadTimeline,
  Rating,
  RenderBlockingStatus,
  TimelineEvent,
  TimelineNote,
  TimelineTable,
  TimelineWaterfallBar,
} from "./types";
import type { CombinedLoad } from "./collectTimelineSources";

const UNATTRIBUTED_LABEL = "Unattributed";

const UNATTRIBUTED_HINT =
  "Lighthouse recorded this long task on the main thread but did not attribute it to a script URL. The work is often browser parsing, style, or layout, an inline script, or a task the trace could not tie to a file.";

function UnattributedLabel() {
  const descriptionId = `unattributed-hint-${useId()}`;
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline cursor-help border-0 bg-transparent p-0 font-[inherit] text-[length:inherit] leading-[inherit] text-inherit underline decoration-dotted decoration-current/60 underline-offset-2"
          aria-describedby={descriptionId}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          {UNATTRIBUTED_LABEL}
        </button>
      </PopoverTrigger>
      <span id={descriptionId} className="sr-only">
        {UNATTRIBUTED_HINT}
      </span>
      <PopoverContent
        side="top"
        align="start"
        role="tooltip"
        className="w-64 p-3 text-xs font-normal leading-relaxed"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {UNATTRIBUTED_HINT}
      </PopoverContent>
    </Popover>
  );
}

function textWithUnattributedHint(text: string) {
  if (!text.includes(UNATTRIBUTED_LABEL)) return text;
  const parts = text.split(UNATTRIBUTED_LABEL);
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 ? <UnattributedLabel /> : null}
    </Fragment>
  ));
}

function ratingClass(rating?: Rating): string {
  if (rating === "good") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (rating === "needs-improvement") return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
  if (rating === "poor") return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
  return "bg-muted text-muted-foreground";
}

const RENDER_BLOCKING_ORDER: RenderBlockingStatus[] = [
  "blocking",
  "potentially-blocking",
  "non-blocking",
];

function blockingStatuses(bars?: TimelineWaterfallBar[]): RenderBlockingStatus[] {
  const present = new Set<RenderBlockingStatus>();
  for (const bar of bars ?? []) {
    if (bar.renderBlocking) present.add(bar.renderBlocking);
  }
  return RENDER_BLOCKING_ORDER.filter((status) => present.has(status));
}

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

function MomentScreenshot({ timing, data }: { timing: number; data: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="shrink-0 overflow-hidden rounded-md border bg-background shadow-sm transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img
            src={data}
            alt={`Page at ${formatMs(timing)}`}
            className="h-28 w-auto max-w-[7rem] object-cover sm:h-32 sm:max-w-[9rem]"
            loading="lazy"
            decoding="async"
          />
          <span className="block border-t px-1.5 py-0.5 text-center text-[10px] tabular-nums text-muted-foreground">
            {formatMs(timing)}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogTitle>Screenshot at {formatMs(timing)}</DialogTitle>
        <img
          src={data}
          alt={`Page at ${formatMs(timing)}`}
          className="max-h-[70vh] w-full object-contain"
        />
        <DialogClose asChild>
          <Button type="button">Close</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

function LcpBreakdown({
  segments,
  axisEnd,
}: {
  segments: NonNullable<TimelineEvent["lcpSegments"]>;
  axisEnd: number;
}) {
  const row = waterfallRowFromLcpSegments(segments);
  if (!row) return null;
  const scale = axisEnd > 0 ? axisEnd : Math.max(row.networkEnd, 1);
  return (
    <div className="mt-2 space-y-1" data-testid="moment-lcp-breakdown">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        LCP breakdown
      </div>
      <WaterfallBarTrack row={row} minStart={0} maxEnd={scale} height={8} />
      <ul className="grid gap-0.5 text-[11px] text-muted-foreground sm:grid-cols-2">
        {segments.map((seg) => (
          <li key={seg.subpart}>
            {seg.label}:{" "}
            <span className="tabular-nums text-foreground">{formatMs(seg.durationMs)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function barTimingLabel(bar: TimelineWaterfallBar, row: TimelineTable["rows"][number] | undefined) {
  const range = `${formatMs(bar.startMs)}–${formatMs(bar.endMs)}`;
  const startLabel = formatMs(bar.startMs);
  const extras = (row ?? [])
    .slice(1)
    .map((cell) => cell.text)
    .filter((text) => text.length > 0 && text !== startLabel);
  return extras.length ? `${range} · ${extras.join(" · ")}` : range;
}

function scriptDownloadLabel(bar: TimelineWaterfallBar): string | null {
  const window =
    bar.downloadStartMs != null && bar.downloadEndMs != null
      ? `${formatMs(bar.downloadStartMs)}–${formatMs(bar.downloadEndMs)}`
      : null;
  const download = window
    ? `downloaded ${window}${bar.downloadDuration ? ` (${bar.downloadDuration})` : ""}`
    : bar.downloadDuration
      ? `downloaded in ${bar.downloadDuration}`
      : null;
  const parts = [bar.scriptSize, download].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function BarIdentity({ bar }: { bar: TimelineWaterfallBar }) {
  if (bar.href) return <ResourceUrlCell url={bar.href} />;
  if (bar.label === UNATTRIBUTED_LABEL) return <UnattributedLabel />;
  return (
    <p className="truncate text-[11px] text-muted-foreground" title={bar.label}>
      {bar.label}
    </p>
  );
}

function WaterfallRows({
  bars,
  table,
  axisEnd,
  showBlockingBadge,
  rowKind = "request",
}: {
  bars: TimelineWaterfallBar[];
  table?: TimelineTable;
  axisEnd: number;
  showBlockingBadge: boolean;
  rowKind?: WaterfallRowKind;
}) {
  const scale = axisEnd > 0 ? axisEnd : Math.max(...bars.map((b) => b.endMs), 1);

  return (
    <div className="space-y-2" data-testid="moment-waterfall">
      {bars.map((bar, index) => {
        const downloadLabel = scriptDownloadLabel(bar);
        const kind: WaterfallRowKind =
          rowKind === "task" || bar.taskKind != null || bar.resourceType === "Task"
            ? "task"
            : "request";
        const row = waterfallRowFromTimelineBar(bar, kind);
        return (
          <div key={bar.id} className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                  <span>{bar.resourceType ?? (kind === "task" ? "Task" : "Request")}</span>
                  {showBlockingBadge && bar.renderBlocking ? (
                    <RenderBlockingBadge status={bar.renderBlocking} />
                  ) : null}
                </div>
                <BarIdentity bar={bar} />
                {bar.priority ? (
                  <p className="text-[11px] text-muted-foreground">Priority {bar.priority}</p>
                ) : null}
                {downloadLabel ? (
                  <p className="text-[11px] tabular-nums text-muted-foreground">{downloadLabel}</p>
                ) : null}
                {bar.coverage ? (
                  <p className="text-[11px] tabular-nums text-muted-foreground">{bar.coverage}</p>
                ) : null}
              </div>
              <span className="shrink-0 pt-0.5 text-right text-[11px] tabular-nums text-muted-foreground">
                {barTimingLabel(bar, table?.rows[index])}
              </span>
            </div>
            <WaterfallBarTrack row={row} minStart={0} maxEnd={scale} height={8} />
          </div>
        );
      })}
    </div>
  );
}

function CollapsedUrlTable({ table, count }: { table: TimelineTable; count: number }) {
  return (
    <details className="group mt-2 rounded-md border border-border/70 bg-muted/20">
      <summary className="cursor-pointer list-none px-2.5 py-1.5 text-xs font-medium text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-foreground/80">URLs</span>
          <span className="tabular-nums text-muted-foreground">({count})</span>
          <span className="text-[10px] font-normal opacity-70 group-open:hidden">show</span>
          <span className="hidden text-[10px] font-normal opacity-70 group-open:inline">hide</span>
        </span>
      </summary>
      <div className="border-t border-border/60 px-1 pb-1">
        <Table className="text-xs" wrapperClassName="mt-0">
          <TableHeader>
            <TableRow>
              {table.headers.map((header) => (
                <TableHead
                  key={header.text}
                  className={cn(
                    "h-8 px-2 py-1 text-[11px]",
                    header.align === "end" && "text-right",
                  )}
                >
                  {header.text}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell
                    key={`${rowIndex}-${cellIndex}`}
                    className={cn(
                      "px-2 py-1.5",
                      cell.align === "end" && "whitespace-nowrap text-right font-mono tabular-nums",
                      cellIndex === 0 && "w-[52%] max-w-0",
                    )}
                  >
                    {cell.href ? (
                      <ResourceUrlCell url={cell.href} />
                    ) : cell.text === UNATTRIBUTED_LABEL ? (
                      <UnattributedLabel />
                    ) : (
                      cell.text
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}

function MomentRequests({
  bars,
  table,
  axisEnd,
  showBlockingBadge,
  summaryLabel = "Requests",
  rowKind = "request",
}: {
  bars?: TimelineWaterfallBar[];
  table?: TimelineTable;
  axisEnd: number;
  showBlockingBadge: boolean;
  summaryLabel?: string;
  rowKind?: WaterfallRowKind;
}) {
  const waterfall = bars ?? [];
  const rowCount = table?.rows.length ?? 0;

  if (waterfall.length > 1) {
    return (
      <details className="group mt-2 rounded-md border border-border/70 bg-muted/20">
        <summary className="cursor-pointer list-none px-2.5 py-1.5 text-xs font-medium text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-foreground/80">{summaryLabel}</span>
            <span className="tabular-nums text-muted-foreground">({waterfall.length})</span>
            <span className="text-[10px] font-normal opacity-70 group-open:hidden">show</span>
            <span className="hidden text-[10px] font-normal opacity-70 group-open:inline">
              hide
            </span>
          </span>
        </summary>
        <div className="border-t border-border/60 px-2.5 py-2.5">
          <WaterfallRows
            bars={waterfall}
            table={table}
            axisEnd={axisEnd}
            showBlockingBadge={showBlockingBadge}
            rowKind={rowKind}
          />
        </div>
      </details>
    );
  }

  if (waterfall.length === 1) {
    return (
      <div className="mt-2">
        <WaterfallRows
          bars={waterfall}
          table={table}
          axisEnd={axisEnd}
          showBlockingBadge={showBlockingBadge}
          rowKind={rowKind}
        />
      </div>
    );
  }

  if (table && rowCount > 1) {
    return <CollapsedUrlTable table={table} count={rowCount} />;
  }

  return null;
}

function noteTimeLabel(note: TimelineNote): string | null {
  if (note.timeMs == null) return null;
  if (note.endMs != null && note.endMs !== note.timeMs) {
    return `${formatMs(note.timeMs)}–${formatMs(note.endMs)}`;
  }
  return formatMs(note.timeMs);
}

function MomentNotes({ notes }: { notes: TimelineNote[] }) {
  return (
    <div className="space-y-3 border-t border-border/70 pt-3">
      {notes.map((note) => {
        const statusLabel =
          note.status === "measured" && note.timeMs == null ? null : note.status.replace("-", " ");
        const timeLabel = noteTimeLabel(note);
        return (
          <div key={note.id} className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold leading-snug">{note.title}</p>
              {note.rating ? (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                    ratingClass(note.rating),
                  )}
                >
                  {note.rating.replace("-", " ")}
                </span>
              ) : null}
              {statusLabel ? (
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {statusLabel}
                </span>
              ) : null}
              {timeLabel ? (
                <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                  {timeLabel}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{note.detail}</p>
          </div>
        );
      })}
    </div>
  );
}

function PhaseHeader({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-20 mb-3 border-b border-border/80 bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
    </div>
  );
}

function MomentCard({ moment, axisEnd }: { moment: TimelineEvent; axisEnd: number }) {
  const muted = moment.status === "not-recorded";
  const downloadBlocking = blockingStatuses(moment.waterfall);
  const statusLabel =
    moment.status === "measured" && !moment.hasTimestamp ? null : moment.status.replace("-", " ");

  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border px-3 py-3 sm:px-4",
        muted && "border-dashed opacity-80",
        moment.kind === "blocking" && !muted && "border-rose-500/30",
        moment.kind === "potentially-blocking" && !muted && "border-amber-500/30",
        moment.kind === "cwv" && !muted && "border-amber-500/30",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold leading-snug sm:text-base">{moment.title}</h4>
            {moment.rating ? (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                  ratingClass(moment.rating),
                )}
              >
                {moment.rating.replace("-", " ")}
              </span>
            ) : null}
            {downloadBlocking.map((status) => (
              <RenderBlockingBadge key={status} status={status} showNonBlocking />
            ))}
            {statusLabel ? (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {statusLabel}
              </span>
            ) : null}
          </div>

          <p className="text-sm text-muted-foreground">{textWithUnattributedHint(moment.detail)}</p>

          <MomentRequests
            bars={moment.waterfall}
            table={moment.table}
            axisEnd={axisEnd}
            showBlockingBadge={downloadBlocking.length > 1}
            summaryLabel={
              moment.id.startsWith("long-task-") || moment.id.startsWith("short-task-")
                ? "Tasks"
                : "Requests"
            }
            rowKind={
              moment.id.startsWith("long-task-") || moment.id.startsWith("short-task-")
                ? "task"
                : "request"
            }
          />

          {moment.notes?.length ? <MomentNotes notes={moment.notes} /> : null}

          {moment.lcpSegments ? (
            <LcpBreakdown segments={moment.lcpSegments} axisEnd={axisEnd} />
          ) : null}
        </div>

        {moment.screenshot ? (
          <MomentScreenshot timing={moment.screenshot.timing} data={moment.screenshot.data} />
        ) : null}
      </div>
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

function momentAnchorId(id: string): string {
  return `timeline-moment-${id}`;
}


function MomentRow({
  moment,
  axisEnd,
  showPhaseHeader,
}: {
  moment: TimelineEvent;
  axisEnd: number;
  showPhaseHeader: boolean;
}) {
  return (
    <li className="relative scroll-mt-28" id={momentAnchorId(moment.id)}>
      {showPhaseHeader ? <PhaseHeader title={moment.phaseTitle} /> : null}

      <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-3 sm:grid-cols-[5.75rem_minmax(0,1fr)]">
        <MomentRail moment={moment} />
        <div className="mb-4 min-w-0">
          <MomentCard moment={moment} axisEnd={axisEnd} />
        </div>
      </div>
    </li>
  );
}

function TaskFilters({
  options,
  enabled,
  shown,
  total,
  onToggle,
}: {
  options: TaskFilterId[];
  enabled: TaskFilterSelection;
  shown: number;
  total: number;
  onToggle: (id: TaskFilterId) => void;
}) {
  if (!options.length) return null;
  const filtering = shown !== total;

  return (
    <div
      role="group"
      aria-label="Filter timeline tasks"
      data-testid="timeline-task-filters"
      className="flex flex-wrap items-center gap-1.5"
    >
      <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Tasks
      </span>
      {options.map((id) => {
        const pressed = enabled.has(id);
        return (
          <button
            key={id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onToggle(id)}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              pressed
                ? "border-transparent bg-white text-black"
                : "border-white/20 bg-black text-white",
            )}
          >
            {TASK_FILTER_LABEL[id]}
          </button>
        );
      })}
      {filtering ? (
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {shown} of {total}
        </span>
      ) : null}
    </div>
  );
}

function VerticalTimeline({
  load,
  timeline,
  stickyTopPx = 0,
}: {
  load: CombinedLoad;
  timeline: PageLoadTimeline;
  stickyTopPx?: number;
}) {
  const { events, axisEndMs } = timeline;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:text-sm">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-rose-500" /> Blocking
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-amber-500" /> Core Web Vital
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-sky-500" /> Marker
        </span>
        <span className="text-muted-foreground/80">Scroll down from 0 ms</span>
        {timeline.simulationLabel ? (
          <span className="text-muted-foreground/80">
            Times include simulated {timeline.simulationLabel}
          </span>
        ) : null}
      </div>

      <UnifiedWaterfall
        load={load}
        events={events}
        axisEndMs={axisEndMs}
        stickyTopPx={stickyTopPx}
      />

      <div className="relative">
        <div
          aria-hidden
          className="absolute bottom-4 left-[2.375rem] top-2 w-px -translate-x-1/2 bg-border sm:left-[2.875rem]"
        />

        <ol className="relative m-0 list-none p-0">
          {events.map((moment) => (
            <MomentRow
              key={`${moment.phaseId}-${moment.id}`}
              moment={moment}
              axisEnd={axisEndMs}
              showPhaseHeader={!!moment.isPhaseStart}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}

export function PageLoadTimeline() {
  const items = usePageSpeedItems();
  const bundles = useMemo(() => buildPageLoadTimelineBundles(items), [items]);
  const { report, tasks } = useDashboardSearchState();
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const [stickyTopPx, setStickyTopPx] = useState(0);
  const enabledTasks = useMemo<TaskFilterSelection>(() => {
    if (tasks == null) return allTaskFilters();
    const allowed = new Set<string>(TASK_FILTERS);
    return new Set(tasks.filter((id): id is TaskFilterId => allowed.has(id)));
  }, [tasks]);

  const activeBundle =
    bundles.find((bundle) => bundle.timeline.label === report) ?? bundles[0] ?? null;
  const active = activeBundle?.timeline ?? null;
  const taskOptions = active ? availableTaskFilters(active.events) : [];

  useEffect(() => {
    const el = stickyHeaderRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => setStickyTopPx(el.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [active?.label, taskOptions.length, bundles.length]);

  if (!bundles.length || !activeBundle || !active) {
    return (
      <p className="px-1 py-6 text-sm text-muted-foreground" role="status">
        No lab metrics available to build a page load timeline.
      </p>
    );
  }

  const reportName = active.label?.trim() || "Report";
  const events = filterTimelineMoments(active.events, enabledTasks);
  const timeline = events === active.events ? active : { ...active, events };

  function toggleTask(id: TaskFilterId) {
    const next = new Set(enabledTasks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const ordered = TASK_FILTERS.filter((filter) => next.has(filter));
    patchDashboardSearch({
      tasks: ordered.length === TASK_FILTERS.length ? null : ordered,
    });
  }

  return (
    <div className="flex flex-col gap-4" data-testid="page-load-timeline">
      <div
        ref={stickyHeaderRef}
        className="sticky top-0 z-30 -mx-1 flex flex-col gap-2 border-b border-border/80 bg-background/95 px-1 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/85"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Viewing report
            </p>
            <p className="truncate text-base font-semibold" data-testid="timeline-report-label">
              {reportName}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {bundles.length > 1 ? (
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Report device">
                {bundles.map((bundle) => {
                  const name = bundle.timeline.label?.trim() || "Report";
                  const selected = bundle.timeline.label === active.label;
                  return (
                    <Button
                      key={bundle.timeline.label}
                      type="button"
                      size="sm"
                      variant={selected ? "default" : "outline"}
                      aria-pressed={selected}
                      onClick={() => patchDashboardSearch({ report: bundle.timeline.label })}
                    >
                      {name}
                    </Button>
                  );
                })}
              </div>
            ) : null}
            <CopyButton
              text={timelineToMarkdown(timeline)}
              size="sm"
              title="Copy timeline as Markdown"
              aria-label="Copy timeline as Markdown"
              data-testid="copy-timeline-markdown"
            >
              <span className="ml-1.5 hidden sm:inline">Copy Markdown</span>
            </CopyButton>
          </div>
        </div>
        <TaskFilters
          options={taskOptions}
          enabled={enabledTasks}
          shown={events.length}
          total={active.events.length}
          onToggle={toggleTask}
        />
      </div>
      <VerticalTimeline
        key={active.label}
        load={activeBundle.load}
        timeline={timeline}
        stickyTopPx={stickyTopPx}
      />
    </div>
  );
}
