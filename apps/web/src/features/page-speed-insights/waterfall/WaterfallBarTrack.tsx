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
import {
  scriptCpuLabel,
  type CriticalChainNode,
} from "@/features/page-speed-insights/shared/scriptResourceFacts";
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

export type CriticalChainMark = "chain" | "longest";

/** Network requests on the critical chain. Longest-path nodes are called out separately. */
export function criticalChainMark(
  row: Pick<WaterfallRow, "kind" | "isCriticalChain" | "chain">,
  segment?: Pick<WaterfallSegment, "isCriticalChain" | "chain">,
): CriticalChainMark | null {
  if (row.kind === "task" || row.kind === "user-mark" || row.kind === "user-measure") return null;
  const onChain = Boolean(segment?.isCriticalChain || row.isCriticalChain);
  if (!onChain) return null;
  if (segment?.chain?.isLongest || row.chain?.isLongest) return "longest";
  return "chain";
}

export function rowCriticalChainMark(row: WaterfallRow): CriticalChainMark | null {
  const segments = row.segments ?? [];
  if (!segments.length) return criticalChainMark(row);
  if (segments.some((segment) => criticalChainMark(row, segment) === "longest")) return "longest";
  if (segments.some((segment) => criticalChainMark(row, segment) === "chain")) return "chain";
  return null;
}

function chainBarClass(mark: CriticalChainMark | null): string | undefined {
  if (mark === "longest") {
    return "ring-1 ring-sky-600 shadow-[inset_0_-2px_0_0] shadow-sky-600 dark:ring-sky-300 dark:shadow-sky-300";
  }
  if (mark === "chain") {
    return "shadow-[inset_0_-2px_0_0] shadow-sky-600/80 dark:shadow-sky-300/80";
  }
  return undefined;
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

function joinParts(parts: Array<string | null | undefined | false>): string | null {
  const line = parts.filter((part): part is string => Boolean(part)).join(" · ");
  return line.length > 0 ? line : null;
}

function chainTooltipLine(
  row: Pick<WaterfallRow, "isCriticalChain" | "chain">,
  segment: Pick<WaterfallSegment, "isCriticalChain" | "chain">,
): string | null {
  const node: CriticalChainNode | undefined = segment.chain ?? row.chain;
  const onChain = Boolean(segment.isCriticalChain || row.isCriticalChain || node);
  if (!onChain) return null;
  const head = node?.isLongest ? "Critical path" : "Critical chain";
  if (node?.extendsMs != null && Math.round(node.extendsMs) > 0) {
    return `${head} · ${formatMs(node.extendsMs)} past its parent`;
  }
  return head;
}

/** Lines shown in the hover tooltip for a bar segment. */
export function segmentTooltipLines(row: WaterfallRow, segment: WaterfallSegment): string[] {
  const name = segment.label ?? row.label;
  const duration = Math.max(0, segment.end - segment.start);
  const timing =
    duration > 0 || row.kind !== "user-mark"
      ? `${formatMs(segment.start)}–${formatMs(segment.end)} · ${formatMs(duration)}`
      : `At ${formatMs(segment.start)}`;
  const lines = [name, `${segmentKindLabel(row, segment)} · ${timing}`];

  const priority = segment.priority ?? row.priority;
  const queue =
    segment.queueStart != null && segment.queueEnd != null
      ? `Queued ${formatMs(segment.queueEnd - segment.queueStart)}`
      : null;
  const meta = joinParts([
    queue,
    priority ? `${formatNetworkPriority(priority)} priority` : null,
    blockingLabel(segment.renderBlocking ?? row.renderBlocking),
    segment.protocol ?? row.protocol,
    segment.isLinkPreload || row.isLinkPreload ? "Preload" : null,
  ]);
  if (meta) lines.push(meta);

  const transfer =
    segment.transferSize != null && segment.transferSize > 0
      ? segment.transferSize
      : row.transferSize != null && row.transferSize > 0 && !row.segments?.length
        ? row.transferSize
        : null;
  const coverage = segment.coverage ?? row.coverage;
  const size = joinParts([
    transfer != null ? `Transfer ${formatBytes(transfer)}` : null,
    coverage ? `Coverage ${coverage}` : null,
  ]);
  if (size) lines.push(size);

  const download = joinParts([
    segment.downloadStartMs != null && segment.downloadEndMs != null
      ? `Downloaded ${formatMs(segment.downloadStartMs)}–${formatMs(segment.downloadEndMs)}`
      : null,
    segment.scriptTransferBytes != null && segment.scriptTransferBytes > 0
      ? formatBytes(segment.scriptTransferBytes)
      : null,
  ]);
  if (download) lines.push(download);

  const cpu = scriptCpuLabel(segment.scriptCpu ?? row.scriptCpu);
  if (cpu) lines.push(cpu);

  const chain = chainTooltipLine(row, segment);
  if (chain) lines.push(chain);

  return lines;
}

function BarInfoPopover({
  lines,
  className,
  style,
  "data-task-kind": taskKind,
  "data-critical-chain": criticalChain,
  "data-testid": testId,
}: {
  lines: string[];
  className?: string;
  style?: React.CSSProperties;
  "data-task-kind"?: string;
  "data-critical-chain"?: CriticalChainMark;
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
          data-critical-chain={criticalChain}
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
            scriptCpu: row.scriptCpu,
            chain: row.chain,
            isCriticalChain: row.isCriticalChain,
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
        const chainMark = criticalChainMark(row, segment);
        const lines = segmentTooltipLines(row, segment);

        const barClass = cn(
          "absolute top-0 bottom-0 rounded-xs opacity-90",
          interactive && "hover:opacity-100",
          color,
          emphasized && chainMark !== "longest" && "ring-1 ring-rose-500/50",
          chainBarClass(chainMark),
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
                data-critical-chain={chainMark ?? undefined}
                className={barClass}
                style={networkStyle}
              />
            ) : (
              <div
                data-task-kind={segment.taskKind}
                data-critical-chain={chainMark ?? undefined}
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
