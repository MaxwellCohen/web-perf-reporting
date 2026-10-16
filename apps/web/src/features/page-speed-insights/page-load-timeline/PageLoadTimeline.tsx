"use client";
/* eslint-disable @next/next/no-img-element */

import { Fragment, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { getNetworkBarColor } from "@/features/page-speed-insights/shared/networkResourceColors";
import { ResourceUrlCell } from "@/features/page-speed-insights/shared/ResourceUrlCell";
import { cn } from "@/lib/cn";
import { buildPageLoadTimelines } from "./buildPageLoadTimeline";
import type {
  MarkerKind,
  PageLoadTimeline,
  Rating,
  TimelineMoment,
  TimelineTable,
  TimelineWaterfallBar,
} from "./types";

const UNATTRIBUTED_LABEL = "Unattributed";

const UNATTRIBUTED_HINT =
  "Lighthouse recorded this long task on the main thread but did not attribute it to a script URL. The work is often browser parsing, style, or layout, an inline script, or a task the trace could not tie to a file.";

function UnattributedLabel() {
  const descriptionId = useId();
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

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms >= 10000 ? 1 : 2)} s`;
  return `${Math.round(ms)} ms`;
}

function ratingClass(rating?: Rating): string {
  if (rating === "good") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (rating === "needs-improvement") return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
  if (rating === "poor") return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
  return "bg-muted text-muted-foreground";
}

function markerDotClass(kind: MarkerKind, rating?: Rating): string {
  if (kind === "blocking") return "bg-rose-500";
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

function LcpBreakdown({ segments }: { segments: NonNullable<TimelineMoment["lcpSegments"]> }) {
  if (!segments.length) return null;
  const total = segments.reduce((sum, s) => sum + s.durationMs, 0) || 1;
  return (
    <div className="mt-2 space-y-1">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        LCP breakdown
      </div>
      <div className="flex h-3 overflow-hidden rounded-full">
        {segments.map((seg) => (
          <div
            key={seg.subpart}
            title={`${seg.label}: ${formatMs(seg.durationMs)}`}
            className={cn(
              "h-full",
              seg.subpart === "timeToFirstByte" && "bg-sky-500/80",
              seg.subpart === "resourceLoadDelay" && "bg-violet-500/80",
              seg.subpart === "resourceLoadDuration" && "bg-emerald-500/80",
              seg.subpart === "elementRenderDelay" && "bg-rose-500/80",
            )}
            style={{ width: `${(seg.durationMs / total) * 100}%` }}
          />
        ))}
      </div>
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
}: {
  bars: TimelineWaterfallBar[];
  table?: TimelineTable;
  axisEnd: number;
}) {
  const scale = axisEnd > 0 ? axisEnd : Math.max(...bars.map((b) => b.endMs), 1);

  return (
    <div className="space-y-3" data-testid="moment-waterfall">
      {bars.map((bar, index) => {
        const left = (bar.startMs / scale) * 100;
        const width = Math.max(1.5, ((bar.endMs - bar.startMs) / scale) * 100);
        return (
          <div key={bar.id} className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium">{bar.resourceType ?? "Request"}</div>
                <BarIdentity bar={bar} />
              </div>
              <span className="shrink-0 pt-0.5 text-right text-[11px] tabular-nums text-muted-foreground">
                {barTimingLabel(bar, table?.rows[index])}
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted/60">
              <div
                className={cn("absolute inset-y-0 rounded-full", getNetworkBarColor(bar.resourceType))}
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            </div>
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
                  className={cn("h-8 px-2 py-1 text-[11px]", header.align === "end" && "text-right")}
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
}: {
  bars?: TimelineWaterfallBar[];
  table?: TimelineTable;
  axisEnd: number;
}) {
  const waterfall = bars ?? [];
  const rowCount = table?.rows.length ?? 0;

  if (waterfall.length > 1) {
    return (
      <details className="group mt-2 rounded-md border border-border/70 bg-muted/20">
        <summary className="cursor-pointer list-none px-2.5 py-1.5 text-xs font-medium text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-foreground/80">Requests</span>
            <span className="tabular-nums text-muted-foreground">({waterfall.length})</span>
            <span className="text-[10px] font-normal opacity-70 group-open:hidden">show</span>
            <span className="hidden text-[10px] font-normal opacity-70 group-open:inline">hide</span>
          </span>
        </summary>
        <div className="border-t border-border/60 px-2.5 py-2.5">
          <WaterfallRows bars={waterfall} table={table} axisEnd={axisEnd} />
        </div>
      </details>
    );
  }

  if (waterfall.length === 1) {
    return (
      <div className="mt-2">
        <WaterfallRows bars={waterfall} table={table} axisEnd={axisEnd} />
      </div>
    );
  }

  if (table && rowCount > 1) {
    return <CollapsedUrlTable table={table} count={rowCount} />;
  }

  return null;
}

function MomentRow({
  moment,
  axisEnd,
  showPhaseHeader,
}: {
  moment: TimelineMoment;
  axisEnd: number;
  showPhaseHeader: boolean;
}) {
  const muted = moment.status === "not-recorded";
  const statusLabel =
    moment.status === "measured" && !moment.hasTimestamp
      ? null
      : moment.status.replace("-", " ");

  return (
    <li className="relative">
      {showPhaseHeader ? (
        <div className="sticky top-0 z-20 mb-3 border-b border-border/80 bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <h3 className="text-sm font-semibold tracking-tight">{moment.phaseTitle}</h3>
        </div>
      ) : null}

      <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-3 sm:grid-cols-[5.75rem_minmax(0,1fr)]">
        <div className="relative z-10 flex flex-col items-center pt-0.5">
          <span
            className={cn(
              "max-w-full px-0.5 text-center text-[11px] font-semibold leading-tight tabular-nums sm:text-xs",
              muted ? "text-muted-foreground/70" : "text-foreground",
            )}
          >
            {formatMs(moment.timeMs)}
          </span>
          {moment.endMs != null && moment.endMs !== moment.timeMs ? (
            <span className="max-w-full truncate px-0.5 text-center text-[9px] tabular-nums text-muted-foreground">
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

        <div
          className={cn(
            "mb-4 min-w-0 rounded-lg border px-3 py-3 sm:px-4",
            muted && "border-dashed opacity-80",
            moment.kind === "blocking" && !muted && "border-rose-500/30",
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
                {statusLabel ? (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {statusLabel}
                  </span>
                ) : null}
              </div>

              <p className="text-sm text-muted-foreground">{textWithUnattributedHint(moment.detail)}</p>

              <MomentRequests bars={moment.waterfall} table={moment.table} axisEnd={axisEnd} />

              {moment.lcpSegments ? <LcpBreakdown segments={moment.lcpSegments} /> : null}
            </div>

            {moment.screenshot ? (
              <MomentScreenshot timing={moment.screenshot.timing} data={moment.screenshot.data} />
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

function VerticalTimeline({ timeline }: { timeline: PageLoadTimeline }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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

      <div className="relative">
        <div
          aria-hidden
          className="absolute bottom-4 left-[2.375rem] top-2 w-px -translate-x-1/2 bg-border sm:left-[2.875rem]"
        />

        <ol className="relative m-0 list-none p-0">
          {timeline.moments.map((moment) => (
            <MomentRow
              key={`${moment.phaseId}-${moment.id}`}
              moment={moment}
              axisEnd={timeline.axisEndMs}
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
  const timelines = useMemo(() => buildPageLoadTimelines(items), [items]);
  const [label, setLabel] = useState<string | null>(null);

  const active = timelines.find((t) => t.label === label) ?? timelines[0] ?? null;

  if (!timelines.length || !active) {
    return (
      <p className="px-1 py-6 text-sm text-muted-foreground" role="status">
        No lab metrics available to build a page load timeline.
      </p>
    );
  }

  const reportName = active.label?.trim() || "Report";

  return (
    <div className="flex flex-col gap-4" data-testid="page-load-timeline">
      <div className="sticky top-0 z-30 -mx-1 flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-background/95 px-1 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Viewing report
          </p>
          <p className="truncate text-base font-semibold" data-testid="timeline-report-label">
            {reportName}
          </p>
        </div>
        {timelines.length > 1 ? (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Report device">
            {timelines.map((t) => {
              const name = t.label?.trim() || "Report";
              const selected = t.label === active.label;
              return (
                <Button
                  key={t.label}
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  aria-pressed={selected}
                  onClick={() => setLabel(t.label)}
                >
                  {name}
                </Button>
              );
            })}
          </div>
        ) : null}
      </div>
      <VerticalTimeline key={active.label} timeline={active} />
    </div>
  );
}
