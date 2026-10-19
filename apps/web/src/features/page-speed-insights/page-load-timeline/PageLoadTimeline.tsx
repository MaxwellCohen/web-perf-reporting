"use client";
/* eslint-disable @next/next/no-img-element */

import { Fragment, useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { ChevronDown } from "lucide-react";
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
import { buildTimeAxisTicks } from "@/features/page-speed-insights/network-metrics/networkWaterfallData";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import { getNetworkBarColor } from "@/features/page-speed-insights/shared/networkResourceColors";
import { ResourceUrlCell } from "@/features/page-speed-insights/shared/ResourceUrlCell";
import { cn } from "@/lib/cn";
import { buildPageLoadTimelines } from "./buildPageLoadTimeline";
import { isIntervalMoment, momentInterval } from "./clusterOverlappingMoments";
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

const RENDER_BLOCKING_LABEL: Record<RenderBlockingStatus, string> = {
  blocking: "Blocking",
  "potentially-blocking": "Potentially blocking",
  "non-blocking": "Non-blocking",
};

function renderBlockingClass(status: RenderBlockingStatus): string {
  if (status === "blocking") return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
  if (status === "potentially-blocking")
    return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

function blockingStatuses(bars?: TimelineWaterfallBar[]): RenderBlockingStatus[] {
  const present = new Set<RenderBlockingStatus>();
  for (const bar of bars ?? []) {
    if (bar.renderBlocking) present.add(bar.renderBlocking);
  }
  return RENDER_BLOCKING_ORDER.filter((status) => present.has(status));
}

function RenderBlockingBadge({ status }: { status: RenderBlockingStatus }) {
  return (
    <span
      className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", renderBlockingClass(status))}
    >
      {RENDER_BLOCKING_LABEL[status]}
    </span>
  );
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

function parallelLaneColor(moment: TimelineEvent): string {
  const resourceType = moment.waterfall?.[0]?.resourceType;
  if (resourceType) return getNetworkBarColor(resourceType);
  return markerDotClass(moment.kind, moment.rating);
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

function LcpBreakdown({ segments }: { segments: NonNullable<TimelineEvent["lcpSegments"]> }) {
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
}: {
  bars: TimelineWaterfallBar[];
  table?: TimelineTable;
  axisEnd: number;
  showBlockingBadge: boolean;
}) {
  const scale = axisEnd > 0 ? axisEnd : Math.max(...bars.map((b) => b.endMs), 1);

  return (
    <div className="space-y-3" data-testid="moment-waterfall">
      {bars.map((bar, index) => {
        const left = (bar.startMs / scale) * 100;
        const width = Math.max(1.5, ((bar.endMs - bar.startMs) / scale) * 100);
        const downloadLabel = scriptDownloadLabel(bar);
        return (
          <div key={bar.id} className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                  <span>{bar.resourceType ?? "Request"}</span>
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
            <div className="relative h-2 overflow-hidden rounded-full bg-muted/60">
              <div
                className={cn(
                  "absolute inset-y-0 rounded-full",
                  getNetworkBarColor(bar.resourceType),
                )}
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
}: {
  bars?: TimelineWaterfallBar[];
  table?: TimelineTable;
  axisEnd: number;
  showBlockingBadge: boolean;
  summaryLabel?: string;
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
              <RenderBlockingBadge key={status} status={status} />
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
          />

          {moment.notes?.length ? <MomentNotes notes={moment.notes} /> : null}

          {moment.lcpSegments ? <LcpBreakdown segments={moment.lcpSegments} /> : null}
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

function scrollToMoment(id: string) {
  document
    .getElementById(momentAnchorId(id))
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Downloads, main-thread tasks, and other work that blocked or could block rendering. */
function isBlockingWork(event: TimelineEvent): boolean {
  if (event.kind === "blocking" || event.kind === "potentially-blocking") return true;
  if (event.id.startsWith("long-task-") || event.id.startsWith("short-task-")) return true;
  return (event.waterfall ?? []).some(
    (bar) => bar.renderBlocking === "blocking" || bar.renderBlocking === "potentially-blocking",
  );
}

function blockingLabel(event: TimelineEvent): string | null {
  if (event.id.startsWith("short-task-") || event.kind === "potentially-blocking") {
    return "Potentially blocking";
  }
  if (event.id.startsWith("long-task-") || event.kind === "blocking") {
    const statuses = blockingStatuses(event.waterfall);
    if (statuses.includes("blocking")) return "Blocking";
    if (statuses.includes("potentially-blocking")) return "Potentially blocking";
    return "Main thread";
  }
  const statuses = blockingStatuses(event.waterfall);
  if (statuses.includes("blocking")) return "Blocking";
  if (statuses.includes("potentially-blocking")) return "Potentially blocking";
  return null;
}

const NETWORK_TYPE_NOUNS: Record<string, [one: string, many: string]> = {
  Image: ["image", "images"],
  Script: ["script", "scripts"],
  Stylesheet: ["style", "styles"],
  Font: ["font", "fonts"],
  Document: ["document", "documents"],
  Fetch: ["fetch", "fetches"],
  XHR: ["XHR", "XHRs"],
  Media: ["media file", "media files"],
  Redirect: ["redirect", "redirects"],
  Other: ["resource", "resources"],
};

function networkTypeNoun(resourceType: string, count: number): string {
  const pair = NETWORK_TYPE_NOUNS[resourceType] ?? [
    resourceType.toLowerCase(),
    `${resourceType.toLowerCase()}s`,
  ];
  return count === 1 ? pair[0] : pair[1];
}

function sentenceCase(value: string): string {
  if (!value) return value;
  return value[0]!.toUpperCase() + value.slice(1);
}

/** e.g. "5 images downloaded", "Style downloaded" */
function overviewDownloadTitle(event: TimelineEvent): string {
  const bars = event.waterfall ?? [];
  const count = Math.max(bars.length, 1);
  const resourceType = bars[0]?.resourceType ?? "Other";
  if (count === 1) return sentenceCase(`${networkTypeNoun(resourceType, 1)} downloaded`);
  return `${count} ${networkTypeNoun(resourceType, count)} downloaded`;
}

/** Clearer lane title: downloads, tasks, or Measure/Mark for user timings. */
function overviewLaneTitle(event: TimelineEvent): string {
  if (event.kind === "cwv") return event.title;
  if (event.id.startsWith("user-timing-")) {
    const isMeasure = event.detail.toLowerCase().includes("measure");
    const name = event.title.toLowerCase().replaceAll("next.js", "next");
    return `${sentenceCase(name)} · ${isMeasure ? "measure" : "mark"}`;
  }
  if (event.id.startsWith("long-task-")) return "Long task";
  if (event.id.startsWith("short-task-")) return event.title;
  if (event.id === "nav-redirects") {
    const hops = event.waterfall?.length ?? 0;
    if (hops > 1) return `${hops} redirects followed`;
    return hops === 1 ? "Redirect followed" : "Redirects";
  }
  if (
    event.id.startsWith("net-") ||
    (event.waterfall?.length && event.waterfall[0]?.resourceType)
  ) {
    return overviewDownloadTitle(event);
  }
  return event.title;
}

function overviewStatusChip(event: TimelineEvent): { label: string; className: string } | null {
  if (event.kind === "cwv") {
    return {
      label: "CWV",
      className: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
    };
  }
  const block = blockingLabel(event);
  if (!block) return null;
  if (block === "Potentially blocking") {
    return { label: "Maybe", className: renderBlockingClass("potentially-blocking") };
  }
  if (block === "Main thread") {
    return { label: "Main", className: renderBlockingClass("blocking") };
  }
  return { label: "Block", className: renderBlockingClass("blocking") };
}

const OVERVIEW_LANE_COLS =
  "grid w-full grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] gap-1.5 sm:grid-cols-[11rem_minmax(0,1fr)]";
const OVERVIEW_LANE_GRID = cn(OVERVIEW_LANE_COLS, "items-center");

/** Lifecycle / CWV points that get full-height vertical guides in the waterfall. */
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

/** Short axis labels for guide markers (Chrome-style). */
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

function overviewGuideLabel(event: TimelineEvent): string {
  return OVERVIEW_GUIDE_LABEL[event.id] ?? event.title;
}

function overviewGuideLineClass(event: TimelineEvent): string {
  if (event.kind === "cwv") {
    if (event.rating === "good") return "bg-emerald-500/65";
    if (event.rating === "poor") return "bg-rose-500/65";
    return "bg-amber-500/65";
  }
  return "bg-sky-500/50";
}

function overviewGuideLabelClass(event: TimelineEvent): string {
  if (event.kind === "cwv") {
    if (event.rating === "good") return "text-emerald-700 dark:text-emerald-300";
    if (event.rating === "poor") return "text-rose-700 dark:text-rose-300";
    return "text-amber-800 dark:text-amber-300";
  }
  return "text-sky-700 dark:text-sky-300";
}

/** Stagger labels that sit within ~6% of each other so they don't collide. */
function overviewGuideLabelLanes(
  markers: TimelineEvent[],
  startMs: number,
  windowMs: number,
): number[] {
  const lanes: number[] = [];
  const occupied: { left: number; lane: number }[] = [];
  const minGapPct = 6;
  for (const event of markers) {
    const left = ((event.timeMs - startMs) / windowMs) * 100;
    let lane = 0;
    while (occupied.some((o) => o.lane === lane && Math.abs(o.left - left) < minGapPct)) {
      lane += 1;
    }
    occupied.push({ left, lane });
    lanes.push(lane);
  }
  return lanes;
}

function LaneChart({
  events,
  startMs,
  endMs,
  heading,
  testId,
  onSelect,
  stickyTopPx = 0,
}: {
  events: TimelineEvent[];
  startMs: number;
  endMs: number;
  heading?: string;
  testId?: string;
  onSelect?: (eventId: string) => void;
  /** Offset below the page sticky header so the time axis stacks, not nests a scrollbar. */
  stickyTopPx?: number;
}) {
  const windowMs = Math.max(endMs - startMs, 1);
  const ticks = buildTimeAxisTicks(startMs, endMs, 5).filter(
    (tick) => tick >= startMs - 1 && tick <= endMs + 1,
  );
  const guideMarkers = events.filter(isOverviewGuideMarker);
  const guideLabelLanes = overviewGuideLabelLanes(guideMarkers, startMs, windowMs);
  const guideLabelRows = guideMarkers.length
    ? Math.max(1, ...guideLabelLanes.map((lane) => lane + 1))
    : 0;

  // Keep caller order (same list as the vertical timeline).
  if (!events.length) return null;

  return (
    <div className="rounded-md border border-border/60 bg-muted/10" data-testid={testId}>
      {heading ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 border-b border-border/40 px-2 py-1">
          <h3 className="text-xs font-semibold tracking-tight">{heading}</h3>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {formatMs(startMs)}–{formatMs(endMs)}
          </span>
        </div>
      ) : null}

      {/* Sticky on the page scroll — sits under the report header. */}
      <div
        className="sticky z-20 border-b border-border/50 bg-background/95 px-1.5 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/90"
        style={{ top: stickyTopPx }}
      >
        <div className={cn(OVERVIEW_LANE_GRID, "px-1")}>
          <div
            aria-hidden
            className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/80"
          >
            Time
          </div>
          <div className="relative h-4" data-testid="overview-time-axis">
            {ticks.map((tick, index) => {
              const left = ((tick - startMs) / windowMs) * 100;
              return (
                <span
                  key={tick}
                  className={cn(
                    "absolute top-0 text-[9px] leading-none tabular-nums text-muted-foreground",
                    index === 0 && "left-0",
                    index === ticks.length - 1 && "right-0 left-auto",
                    index > 0 && index < ticks.length - 1 && "-translate-x-1/2",
                  )}
                  style={
                    index === 0 || index === ticks.length - 1 ? undefined : { left: `${left}%` }
                  }
                >
                  {formatMs(tick)}
                </span>
              );
            })}
            {ticks.map((tick) => (
              <div
                key={`stub-${tick}`}
                aria-hidden
                className="absolute bottom-0 h-1.5 w-px bg-border/70"
                style={{ left: `${((tick - startMs) / windowMs) * 100}%` }}
              />
            ))}
          </div>
        </div>
        {guideMarkers.length > 0 ? (
          <div className={cn(OVERVIEW_LANE_GRID, "mt-0.5 px-1")}>
            <div
              aria-hidden
              className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/80"
            >
              Marks
            </div>
            <div
              className="relative"
              style={{ height: `${guideLabelRows * 0.75}rem` }}
              data-testid="overview-guide-labels"
            >
              {guideMarkers.map((event, index) => {
                const left = ((event.timeMs - startMs) / windowMs) * 100;
                const lane = guideLabelLanes[index] ?? 0;
                const short = overviewGuideLabel(event);
                const full = `${overviewLaneTitle(event)} · ${formatMs(event.timeMs)}`;
                return (
                  <span
                    key={`label-${event.id}`}
                    title={full}
                    className={cn(
                      "absolute left-0 text-[9px] font-semibold leading-none -translate-x-1/2",
                      overviewGuideLabelClass(event),
                      left < 4 && "translate-x-0",
                      left > 96 && "-translate-x-full",
                    )}
                    style={{ left: `${left}%`, top: `${lane * 0.75}rem` }}
                    data-guide-label={event.id}
                  >
                    {short}
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative px-1.5 py-1">
        <div
          className={cn(
            "pointer-events-none absolute inset-y-1 left-1.5 right-1.5 z-0 px-1",
            OVERVIEW_LANE_COLS,
          )}
          data-testid="overview-tick-grid"
          aria-hidden
        >
          <div />
          <div className="relative min-h-full">
            {ticks.map((tick) => (
              <div
                key={tick}
                className="absolute top-0 bottom-0 w-px bg-border/45"
                style={{ left: `${((tick - startMs) / windowMs) * 100}%` }}
              />
            ))}
          </div>
        </div>

        {guideMarkers.length > 0 ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-y-1 left-1.5 right-1.5 z-0 px-1",
              OVERVIEW_LANE_COLS,
            )}
            data-testid="overview-guide-lines"
            aria-hidden
          >
            <div />
            <div className="relative min-h-full">
              {guideMarkers.map((event) => {
                const left = ((event.timeMs - startMs) / windowMs) * 100;
                return (
                  <div
                    key={`guide-${event.id}`}
                    className={cn(
                      "absolute top-0 bottom-0 w-px -translate-x-1/2",
                      overviewGuideLineClass(event),
                    )}
                    style={{ left: `${left}%` }}
                    data-guide={event.id}
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        <ul className="relative z-[1] m-0 list-none p-0">
          {events.map((event) => {
            const range = momentInterval(event);
            const isPoint = !isIntervalMoment(event);
            const durationMs = range.endMs - range.startMs;
            const left = isPoint
              ? ((event.timeMs - startMs) / windowMs) * 100
              : ((range.startMs - startMs) / windowMs) * 100;
            const width = Math.max(1.5, (durationMs / windowMs) * 100);
            const timeLabel = isPoint
              ? formatMs(event.timeMs)
              : `${formatMs(range.startMs)}–${formatMs(range.endMs)}`;
            const durationLabel = formatMs(durationMs);
            const laneTitle = overviewLaneTitle(event);
            const status = overviewStatusChip(event);
            const barTitle = isPoint
              ? `${laneTitle}: ${timeLabel}`
              : `${laneTitle}: ${timeLabel} · ${durationLabel}`;
            const row = (
              <>
                <span className="flex min-w-0 items-center gap-1" title={barTitle}>
                  <span className="truncate text-[11px] font-medium leading-none text-foreground">
                    {laneTitle}
                  </span>
                  {status ? (
                    <span
                      className={cn(
                        "shrink-0 rounded px-1 py-px text-[9px] font-medium leading-none",
                        status.className,
                      )}
                    >
                      {status.label}
                    </span>
                  ) : null}
                </span>
                <div className="relative h-3 min-w-0 overflow-hidden rounded-sm bg-muted/60">
                  {isPoint ? (
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 w-1 -translate-x-1/2 rounded-full",
                        parallelLaneColor(event),
                      )}
                      style={{ left: `${left}%` }}
                      title={barTitle}
                    />
                  ) : (
                    <div
                      className={cn(
                        "absolute inset-y-0 flex min-w-0 items-center overflow-hidden rounded-sm px-1",
                        parallelLaneColor(event),
                      )}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={barTitle}
                    >
                      {width >= 8 ? (
                        <span className="truncate text-[9px] font-medium leading-none tabular-nums text-white drop-shadow-sm">
                          {durationLabel}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            );
            return (
              <li key={event.id}>
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(event.id)}
                    className={cn(
                      OVERVIEW_LANE_GRID,
                      "rounded-sm px-1 py-0.5 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    )}
                  >
                    {row}
                  </button>
                ) : (
                  <div className={cn(OVERVIEW_LANE_GRID, "px-1 py-0.5")}>{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

type OverviewFocus = "all" | "blocking";

/** About 200 drag stops, and a divisor of the axis so the end thumb can sit on the trace end. */
function timeRangeStep(axisEndMs: number): number {
  const target = Math.max(1, Math.round(axisEndMs / 200));
  for (let step = target; step > 1; step--) {
    if (axisEndMs % step === 0) return step;
  }
  return 1;
}

function snapTime(value: number, step: number, axisEndMs: number): number {
  if (value >= axisEndMs - step / 2) return axisEndMs;
  const snapped = Math.round(value / step) * step;
  return Math.min(axisEndMs, Math.max(0, snapped));
}

function eventOverlapsTimeRange(event: TimelineEvent, startMs: number, endMs: number): boolean {
  const interval = momentInterval(event);
  return interval.endMs >= startMs && interval.startMs <= endMs;
}

function TimeRangeFilter({
  axisEndMs,
  startMs,
  endMs,
  onChange,
}: {
  axisEndMs: number;
  startMs: number;
  endMs: number;
  onChange: (startMs: number, endMs: number) => void;
}) {
  const step = timeRangeStep(axisEndMs);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"start" | "end" | null>(null);
  const [focused, setFocused] = useState<"start" | "end" | null>(null);
  const filtering = startMs > 0 || endMs < axisEndMs;
  const startPct = axisEndMs > 0 ? (startMs / axisEndMs) * 100 : 0;
  const endPct = axisEndMs > 0 ? (endMs / axisEndMs) * 100 : 100;

  function move(which: "start" | "end", value: number) {
    if (which === "start") onChange(Math.max(0, Math.min(value, endMs - step)), endMs);
    else onChange(startMs, Math.min(axisEndMs, Math.max(value, startMs + step)));
  }

  function valueFromPointer(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return startMs;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return snapTime(ratio * axisEndMs, step, axisEndMs);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const value = valueFromPointer(event.clientX);
    const which = Math.abs(value - startMs) <= Math.abs(value - endMs) ? "start" : "end";
    dragRef.current = which;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // jsdom and untrusted events have no active pointer to capture.
    }
    move(which, value);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    move(dragRef.current, valueFromPointer(event.clientX));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  return (
    <div
      role="group"
      aria-label="Time range"
      data-testid="overview-time-range"
      className="flex min-w-[16rem] flex-1 items-center gap-2"
    >
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Range
      </span>
      <div
        ref={trackRef}
        data-testid="overview-time-range-track"
        className="relative h-4 min-w-[8rem] flex-1 cursor-ew-resize touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted-foreground/30"
        />
        <div
          aria-hidden
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-foreground"
          style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
        />
        <div
          aria-hidden
          className={cn(
            "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow-sm",
            focused === "start" && "ring-2 ring-ring",
          )}
          style={{ left: `${startPct}%` }}
        />
        <div
          aria-hidden
          className={cn(
            "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow-sm",
            focused === "end" && "ring-2 ring-ring",
          )}
          style={{ left: `${endPct}%` }}
        />
        <input
          type="range"
          aria-label="Range start"
          aria-valuetext={formatMs(startMs)}
          min={0}
          max={axisEndMs}
          step={step}
          value={startMs}
          onChange={(event) => move("start", Number(event.target.value))}
          onFocus={() => setFocused("start")}
          onBlur={() => setFocused(null)}
          className="sr-only"
        />
        <input
          type="range"
          aria-label="Range end"
          aria-valuetext={formatMs(endMs)}
          min={0}
          max={axisEndMs}
          step={step}
          value={endMs}
          onChange={(event) => move("end", Number(event.target.value))}
          onFocus={() => setFocused("end")}
          onBlur={() => setFocused(null)}
          className="sr-only"
        />
      </div>
      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
        {formatMs(startMs)}–{formatMs(endMs)}
      </span>
      {filtering ? (
        <button
          type="button"
          onClick={() => onChange(0, axisEndMs)}
          className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Reset
        </button>
      ) : null}
    </div>
  );
}

function TimelineOverview({
  events,
  axisEndMs,
  stickyTopPx = 0,
}: {
  events: TimelineEvent[];
  axisEndMs: number;
  stickyTopPx?: number;
}) {
  const [open, setOpen] = useState(true);
  const [focus, setFocus] = useState<OverviewFocus>("all");
  const [rangeStartMs, setRangeStartMs] = useState(0);
  const [rangeEndMs, setRangeEndMs] = useState(axisEndMs);
  const rangeActive = rangeStartMs > 0 || rangeEndMs < axisEndMs;
  const rangedEvents = rangeActive
    ? events.filter((event) => eventOverlapsTimeRange(event, rangeStartMs, rangeEndMs))
    : events;
  const cwvs = rangedEvents.filter((event) => event.kind === "cwv");
  const blocking = rangedEvents.filter(isBlockingWork);

  if (events.length < 1) return null;

  const shown = focus === "blocking" ? blocking : rangedEvents;
  const summaryId = "timeline-overview-summary";
  const eventCount =
    rangedEvents.length === events.length
      ? `${events.length} events`
      : `${rangedEvents.length} of ${events.length} events`;

  return (
    <div className="space-y-1.5" data-testid="timeline-overview">
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="timeline-overview-panel"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 items-center gap-1.5 rounded-sm text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <ChevronDown
            aria-hidden
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
              !open && "-rotate-90",
            )}
          />
          <p id={summaryId} className="truncate text-xs font-semibold tracking-tight">
            Waterfall view
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {eventCount}
            {cwvs.length > 0 ? ` · ${cwvs.length} CWV` : ""}
            {blocking.length > 0 ? ` · ${blocking.length} blocking` : ""}
            {" · "}
            {formatMs(rangeStartMs)}–{formatMs(rangeEndMs)}
          </p>
        </button>
        {open ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pl-5">
            <div
              role="group"
              aria-label="Overview focus"
              data-testid="overview-focus"
              className="flex flex-wrap items-center gap-1"
            >
              <button
                type="button"
                aria-pressed={focus === "all"}
                onClick={() => setFocus("all")}
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  focus === "all"
                    ? "border-transparent bg-foreground text-background"
                    : "border-border bg-background text-foreground",
                )}
              >
                All ({rangedEvents.length})
              </button>
              <button
                type="button"
                aria-pressed={focus === "blocking"}
                disabled={blocking.length === 0}
                onClick={() => setFocus("blocking")}
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  focus === "blocking"
                    ? "border-transparent bg-rose-600 text-white"
                    : "border-border bg-background text-foreground",
                  blocking.length === 0 && "opacity-50",
                )}
              >
                Blocking ({blocking.length})
              </button>
            </div>
            {axisEndMs > 0 ? (
              <TimeRangeFilter
                axisEndMs={axisEndMs}
                startMs={rangeStartMs}
                endMs={rangeEndMs}
                onChange={(startMs, endMs) => {
                  setRangeStartMs(startMs);
                  setRangeEndMs(endMs);
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {open ? (
        <div id="timeline-overview-panel" role="region" aria-labelledby={summaryId}>
          {shown.length > 0 ? (
            <LaneChart
              events={shown}
              startMs={rangeStartMs}
              endMs={rangeEndMs}
              testId="overview-lanes"
              onSelect={scrollToMoment}
              stickyTopPx={stickyTopPx}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              {focus === "blocking"
                ? "No blocking work in this view."
                : "No events in this time range."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
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
  timeline,
  stickyTopPx = 0,
}: {
  timeline: PageLoadTimeline;
  stickyTopPx?: number;
}) {
  // One ordered list drives both the waterfall overview and the scroll timeline.
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

      <TimelineOverview events={events} axisEndMs={axisEndMs} stickyTopPx={stickyTopPx} />

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
  const timelines = useMemo(() => buildPageLoadTimelines(items), [items]);
  const { report, tasks } = useDashboardSearchState();
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const [stickyTopPx, setStickyTopPx] = useState(0);
  const enabledTasks = useMemo<TaskFilterSelection>(() => {
    if (tasks == null) return allTaskFilters();
    const allowed = new Set<string>(TASK_FILTERS);
    return new Set(tasks.filter((id): id is TaskFilterId => allowed.has(id)));
  }, [tasks]);

  const active = timelines.find((timeline) => timeline.label === report) ?? timelines[0] ?? null;
  const taskOptions = active ? availableTaskFilters(active.events) : [];

  useEffect(() => {
    const el = stickyHeaderRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => setStickyTopPx(el.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [active?.label, taskOptions.length, timelines.length]);

  if (!timelines.length || !active) {
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
                      onClick={() => patchDashboardSearch({ report: t.label })}
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
      <VerticalTimeline key={active.label} timeline={timeline} stickyTopPx={stickyTopPx} />
    </div>
  );
}
