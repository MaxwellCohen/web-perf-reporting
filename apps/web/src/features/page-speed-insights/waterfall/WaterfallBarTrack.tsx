"use client";

import { useId, useState } from "react";
import {
  getSegmentStyle,
  type WaterfallRow,
  type WaterfallSegment,
} from "@/features/page-speed-insights/waterfall/waterfallData";
import {
  getNetworkBarColor,
  QUEUE_SEGMENT_COLOR,
} from "@/features/page-speed-insights/shared/networkResourceColors";
import {
  formatBytes,
  formatMs,
  formatNetworkPriority,
} from "@/features/page-speed-insights/shared/format";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const BAR_HEIGHT = 8;

const SHORT_TASK_BAR_COLOR = "bg-amber-400/90 dark:bg-amber-400/80";
const LONG_TASK_BAR_COLOR = "bg-rose-500/85";
const USER_MEASURE_BAR_COLOR = "bg-teal-600/80 dark:bg-teal-400/70";
const USER_MARK_DOT_COLOR = "bg-teal-700 dark:bg-teal-300";

function segmentBarColor(row: WaterfallRow, segment: WaterfallSegment): string {
  if (segment.colorClass) return segment.colorClass;
  if (row.kind === "task") {
    return segment.taskKind === "long" ? LONG_TASK_BAR_COLOR : SHORT_TASK_BAR_COLOR;
  }
  if (row.kind === "user-measure") return USER_MEASURE_BAR_COLOR;
  return getNetworkBarColor(row.resourceType);
}

function isEmphasizedBlocking(segment: WaterfallSegment): boolean {
  return (
    segment.renderBlocking === "blocking" || segment.renderBlocking === "potentially-blocking"
  );
}

function blockingLabel(status: WaterfallSegment["renderBlocking"]): string | null {
  if (status === "blocking") return "Blocking";
  if (status === "potentially-blocking") return "Potentially blocking";
  return null;
}

function segmentKindLabel(row: WaterfallRow, segment: WaterfallSegment): string {
  if (row.kind === "task") {
    return segment.taskKind === "long" ? "Long task" : "Task";
  }
  if (row.kind === "user-measure") return "User timing measure";
  if (row.kind === "user-mark") return "User timing mark";
  return toTitleCase(row.resourceType);
}

/** Lines shown in the hover tooltip for a bar segment. */
export function segmentTooltipLines(row: WaterfallRow, segment: WaterfallSegment): string[] {
  const name = segment.label ?? row.label;
  const duration = Math.max(0, segment.end - segment.start);
  const lines = [name, segmentKindLabel(row, segment)];

  if (duration > 0 || row.kind !== "user-mark") {
    lines.push(`${formatMs(segment.start)}–${formatMs(segment.end)} · ${formatMs(duration)}`);
  } else {
    lines.push(`At ${formatMs(segment.start)}`);
  }

  if (segment.queueStart != null && segment.queueEnd != null) {
    lines.push(`Queue ${formatMs(segment.queueEnd - segment.queueStart)}`);
  }

  const blocking = blockingLabel(segment.renderBlocking ?? row.renderBlocking);
  if (blocking) lines.push(blocking);

  const priority = segment.priority ?? row.priority;
  if (priority) lines.push(`Priority ${formatNetworkPriority(priority)}`);

  const coverage = segment.coverage ?? row.coverage;
  if (coverage) lines.push(coverage);

  const protocol = segment.protocol ?? row.protocol;
  if (protocol) lines.push(protocol);

  if (segment.transferSize != null && segment.transferSize > 0) {
    lines.push(formatBytes(segment.transferSize));
  } else if (row.transferSize != null && row.transferSize > 0 && !row.segments?.length) {
    lines.push(formatBytes(row.transferSize));
  }

  if (segment.downloadStartMs != null && segment.downloadEndMs != null) {
    lines.push(
      `Script download ${formatMs(segment.downloadStartMs)}–${formatMs(segment.downloadEndMs)}`,
    );
  }
  if (segment.scriptTransferBytes != null && segment.scriptTransferBytes > 0) {
    lines.push(`Script ${formatBytes(segment.scriptTransferBytes)}`);
  }

  if (segment.isCriticalChain || row.isCriticalChain) lines.push("Critical chain");
  if (segment.isLinkPreload || row.isLinkPreload) lines.push("Preload");

  return lines;
}

function BarInfoPopover({
  lines,
  className,
  style,
  "data-task-kind": taskKind,
  "data-testid": testId,
}: {
  lines: string[];
  className?: string;
  style?: React.CSSProperties;
  "data-task-kind"?: string;
  "data-testid"?: string;
}) {
  const descriptionId = useId();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={className}
          style={style}
          aria-label={lines.join(", ")}
          aria-describedby={descriptionId}
          data-task-kind={taskKind}
          data-testid={testId}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        />
      </PopoverAnchor>
      <span id={descriptionId} className="sr-only">
        {lines.join(". ")}
      </span>
      <PopoverContent
        side="top"
        align="center"
        role="tooltip"
        className="z-50 w-auto max-w-65 p-2 text-xs font-normal leading-snug"
        data-testid="waterfall-bar-tooltip"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {lines.map((line, index) => (
          <p
            key={`${index}-${line}`}
            className={cn(
              "break-all",
              index === 0 ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {line}
          </p>
        ))}
      </PopoverContent>
    </Popover>
  );
}

type WaterfallBarTrackProps = {
  row: WaterfallRow;
  minStart: number;
  maxEnd: number;
  /** Override bar track height (moment mini-charts use a shorter track). */
  height?: number;
  /** When false, skip hover tooltips (moment mini-charts). */
  interactive?: boolean;
};

export function WaterfallBarTrack({
  row,
  minStart,
  maxEnd,
  height = BAR_HEIGHT,
  interactive = true,
}: WaterfallBarTrackProps) {
  if (row.kind === "user-mark") {
    const range = maxEnd - minStart;
    const leftPct = range > 0 ? ((row.networkStart - minStart) / range) * 100 : 0;
    const markSegment: WaterfallSegment = {
      id: `${row.id}-mark`,
      start: row.networkStart,
      end: row.networkEnd,
      label: row.label,
    };
    const lines = segmentTooltipLines(row, markSegment);
    const markClass = cn(
      "absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-background",
      USER_MARK_DOT_COLOR,
    );
    return (
      <div
        className="relative w-full min-w-0 overflow-visible rounded-sm bg-muted/40 group-hover:bg-muted/55"
        style={{ height }}
        data-testid="waterfall-mark-track"
      >
        {interactive ? (
          <BarInfoPopover
            lines={lines}
            data-testid="waterfall-user-mark-dot"
            className={markClass}
            style={{ left: `${leftPct}%` }}
          />
        ) : (
          <div
            data-testid="waterfall-user-mark-dot"
            className={markClass}
            style={{ left: `${leftPct}%` }}
          />
        )}
      </div>
    );
  }

  const segments =
    row.segments && row.segments.length > 0
      ? row.segments
      : [
          {
            id: `${row.id}-default`,
            start: row.networkStart,
            end: row.networkEnd,
            queueStart: row.queueStart,
            queueEnd: row.queueEnd,
            renderBlocking: row.renderBlocking,
            label: row.label,
            priority: row.priority,
            coverage: row.coverage,
          } satisfies WaterfallSegment,
        ];

  return (
    <div
      className="relative w-full min-w-0 overflow-visible rounded-sm bg-muted/40 group-hover:bg-muted/55"
      style={{ height }}
      data-testid="waterfall-bar-track"
    >
      {segments.map((segment) => {
        const queueStyle =
          segment.queueStart != null && segment.queueEnd != null
            ? getSegmentStyle(segment.queueStart, segment.queueEnd, minStart, maxEnd)
            : null;
        const networkStyle = getSegmentStyle(segment.start, segment.end, minStart, maxEnd);
        const color = segmentBarColor(row, segment);
        const emphasized = isEmphasizedBlocking(segment);
        const lines = segmentTooltipLines(row, segment);

        const barClass = cn(
          "absolute top-0 bottom-0 rounded-xs opacity-90",
          interactive && "hover:opacity-100",
          color,
          emphasized && "ring-1 ring-rose-500/50",
        );
        return (
          <div key={segment.id}>
            {queueStyle ? (
              <div
                className={cn("absolute top-0 bottom-0 rounded-xs", QUEUE_SEGMENT_COLOR)}
                style={queueStyle}
                aria-label={
                  interactive
                    ? `Queue ${formatMs(segment.queueEnd! - segment.queueStart!)}`
                    : undefined
                }
              />
            ) : null}
            {interactive ? (
              <BarInfoPopover
                lines={lines}
                data-task-kind={segment.taskKind}
                className={barClass}
                style={networkStyle}
              />
            ) : (
              <div
                data-task-kind={segment.taskKind}
                className={barClass}
                style={networkStyle}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export const WATERFALL_SPECIAL_LEGEND = [
  { key: "short-task", label: "Task", className: SHORT_TASK_BAR_COLOR },
  { key: "long-task", label: "Long task", className: LONG_TASK_BAR_COLOR },
  { key: "user-timing", label: "User timing", className: USER_MEASURE_BAR_COLOR },
] as const;
