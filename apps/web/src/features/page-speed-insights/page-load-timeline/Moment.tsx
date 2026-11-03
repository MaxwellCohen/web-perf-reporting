"use client";

import { createContext, use, type ReactNode } from "react";
import { RenderNodeImage } from "@/features/page-speed-insights/lh-categories/table/RenderNode";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import { RenderBlockingBadge } from "@/features/page-speed-insights/waterfall/renderBlockingBadge";
import { cn } from "@/lib/cn";
import { LcpBreakdown, MomentScreenshot } from "./MomentMedia";
import { MomentNotes } from "./MomentNotes";
import { MomentRequests } from "./MomentRequests";
import { ratingClass } from "./timelineStyles";
import { textWithUnattributedHint } from "./UnattributedLabel";
import type { RenderBlockingStatus, TimelineEvent, TimelineWaterfallBar } from "./types";

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

type MomentContextValue = { moment: TimelineEvent; axisEnd: number; deviceLabel: string };

const MomentContext = createContext<MomentContextValue | null>(null);

function useMoment(): MomentContextValue {
  const value = use(MomentContext);
  if (!value) throw new Error("Moment parts must be rendered inside <Moment>");
  return value;
}

function isTaskMoment(moment: TimelineEvent): boolean {
  return moment.id.startsWith("long-task-") || moment.id.startsWith("short-task-");
}

function MomentRoot({
  moment,
  axisEnd,
  deviceLabel,
  className,
  children,
}: MomentContextValue & { className?: string; children: ReactNode }) {
  const muted = moment.status === "not-recorded";
  return (
    <MomentContext value={{ moment, axisEnd, deviceLabel }}>
      <div
        className={cn(
          "min-w-0 rounded-lg border px-3 py-3 sm:px-4",
          muted && "border-dashed opacity-80",
          moment.kind === "blocking" && !muted && "border-rose-500/30",
          moment.kind === "potentially-blocking" && !muted && "border-amber-500/30",
          moment.kind === "cwv" && !muted && "border-amber-500/30",
          className,
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">{children}</div>
      </div>
    </MomentContext>
  );
}

function MomentBody({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("min-w-0 flex-1 space-y-2 overflow-x-clip", className)}>{children}</div>
  );
}

function MomentHeader({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

function MomentTitle({ className }: { className?: string }) {
  const { moment } = useMoment();
  return (
    <h4 className={cn("text-sm font-semibold leading-snug sm:text-base", className)}>
      {moment.title}
    </h4>
  );
}

function MomentTime() {
  const { moment } = useMoment();
  if (!moment.hasTimestamp || !Number.isFinite(moment.timeMs)) return null;
  const start = moment.startMs;
  const end = moment.endMs ?? moment.timeMs;
  const isInterval = start != null && Number.isFinite(start) && end > start;
  return (
    <span
      className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground"
      data-testid="moment-time"
    >
      {isInterval
        ? `${formatMs(start)} – ${formatMs(end)} · ${formatMs(end - start)}`
        : formatMs(moment.timeMs)}
    </span>
  );
}

function MomentRating() {
  const { moment } = useMoment();
  if (!moment.rating) return null;
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
        ratingClass(moment.rating),
      )}
    >
      {moment.rating.replace("-", " ")}
    </span>
  );
}

function MomentBlockingBadges() {
  const { moment } = useMoment();
  return blockingStatuses(moment.waterfall).map((status) => (
    <RenderBlockingBadge key={status} status={status} showNonBlocking />
  ));
}

function MomentStatus() {
  const { moment } = useMoment();
  if (moment.status === "measured" && !moment.hasTimestamp) return null;
  return (
    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
      {moment.status.replace("-", " ")}
    </span>
  );
}

function MomentDetail({ className }: { className?: string }) {
  const { moment } = useMoment();
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {textWithUnattributedHint(moment.detail)}
    </p>
  );
}

function MomentRequestList() {
  const { moment, axisEnd } = useMoment();
  const task = isTaskMoment(moment);
  return (
    <MomentRequests
      bars={moment.waterfall}
      table={moment.table}
      axisEnd={axisEnd}
      showBlockingBadge={blockingStatuses(moment.waterfall).length > 1}
      summaryLabel={task ? "Tasks" : "Requests"}
      rowKind={task ? "task" : "request"}
    />
  );
}

function MomentNoteList() {
  const { moment } = useMoment();
  return moment.notes?.length ? <MomentNotes notes={moment.notes} /> : null;
}

function MomentLcpBreakdown() {
  const { moment, axisEnd } = useMoment();
  return moment.lcpSegments ? (
    <LcpBreakdown segments={moment.lcpSegments} axisEnd={axisEnd} />
  ) : null;
}

function MomentLcpElement() {
  const { moment, deviceLabel } = useMoment();
  if (!moment.lcpElement) return null;
  return (
    <div className="shrink-0" data-testid="lcp-element-screenshot">
      <RenderNodeImage item={moment.lcpElement} device={deviceLabel} imageSize={140} />
    </div>
  );
}

function MomentFilmstrip() {
  const { moment } = useMoment();
  return moment.screenshot ? (
    <MomentScreenshot timing={moment.screenshot.timing} data={moment.screenshot.data} />
  ) : null;
}

export const Moment = {
  Root: MomentRoot,
  Body: MomentBody,
  Header: MomentHeader,
  Title: MomentTitle,
  Time: MomentTime,
  Rating: MomentRating,
  BlockingBadges: MomentBlockingBadges,
  Status: MomentStatus,
  Detail: MomentDetail,
  Requests: MomentRequestList,
  Notes: MomentNoteList,
  LcpBreakdown: MomentLcpBreakdown,
  LcpElement: MomentLcpElement,
  Screenshot: MomentFilmstrip,
};
