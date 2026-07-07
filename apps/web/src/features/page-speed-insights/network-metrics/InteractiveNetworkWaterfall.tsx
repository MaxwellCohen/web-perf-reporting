"use client";

import { Fragment, useCallback, useMemo } from "react";
import {
  buildTimeAxisTicks,
  getSegmentStyle,
  type NetworkWaterfallRow,
} from "@/features/page-speed-insights/network-metrics/networkWaterfallData";
import type { NetworkRequestTimeRange } from "@/features/page-speed-insights/shared/networkRequestsTable";
import {
  getNetworkBarColor,
  QUEUE_SEGMENT_COLOR,
} from "@/features/page-speed-insights/shared/networkResourceColors";
import { formatBytes } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { cn } from "@/lib/utils";

export type WaterfallMilestones = {
  fcp?: number;
  lcp?: number;
  domContentLoaded?: number;
};

type InteractiveNetworkWaterfallProps = {
  rows: NetworkWaterfallRow[];
  timeRange: NetworkRequestTimeRange;
  milestones?: WaterfallMilestones;
  selectedId?: string | null;
  onSelectRow?: (id: string | null) => void;
};

const BAR_HEIGHT = 16;
const LABEL_COLUMN_WIDTH = 260;
const URL_PROTOCOL_REGEX = /^https?:\/\//;

function shortenUrl(url: string): string {
  return url.replace(URL_PROTOCOL_REGEX, "");
}

function formatMs(value: number): string {
  return `${Math.round(value)} ms`;
}

type WaterfallBarTrackProps = {
  row: NetworkWaterfallRow;
  minStart: number;
  maxEnd: number;
};

function WaterfallBarTrack({ row, minStart, maxEnd }: WaterfallBarTrackProps) {
  const networkColor = getNetworkBarColor(row.resourceType);
  const queueStyle =
    row.queueStart != null && row.queueEnd != null
      ? getSegmentStyle(row.queueStart, row.queueEnd, minStart, maxEnd)
      : null;
  const networkStyle = getSegmentStyle(row.networkStart, row.networkEnd, minStart, maxEnd);

  return (
    <div
      className="relative w-full min-w-0 rounded-md overflow-hidden bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60"
      style={{ height: BAR_HEIGHT }}
    >
      {queueStyle ? (
        <div
          className={cn(
            "absolute top-0 bottom-0 rounded-[3px] shadow-sm ring-1 ring-black/5 dark:ring-white/10",
            QUEUE_SEGMENT_COLOR,
          )}
          style={queueStyle}
          aria-label={`Queue ${formatMs(row.queueEnd! - row.queueStart!)}`}
        />
      ) : null}
      <div
        className={cn(
          "absolute top-0 bottom-0 rounded-[3px] shadow-sm ring-1 ring-black/5 dark:ring-white/10",
          networkColor,
        )}
        style={networkStyle}
        aria-label={`Network ${formatMs(row.networkEnd - row.networkStart)}`}
      />
    </div>
  );
}

type MilestoneItem = {
  key: string;
  label: string;
  value: number;
};

function getMilestoneItems(milestones?: WaterfallMilestones): MilestoneItem[] {
  if (!milestones) return [];
  const items: MilestoneItem[] = [];
  if (milestones.fcp != null && milestones.fcp > 0) {
    items.push({ key: "fcp", label: "FCP", value: milestones.fcp });
  }
  if (milestones.lcp != null && milestones.lcp > 0) {
    items.push({ key: "lcp", label: "LCP", value: milestones.lcp });
  }
  if (milestones.domContentLoaded != null && milestones.domContentLoaded > 0) {
    items.push({ key: "dcl", label: "DCL", value: milestones.domContentLoaded });
  }
  return items;
}

type MilestoneOverlayProps = {
  minStart: number;
  maxEnd: number;
  milestones?: WaterfallMilestones;
};

function MilestoneOverlay({ minStart, maxEnd, milestones }: MilestoneOverlayProps) {
  const items = useMemo(() => getMilestoneItems(milestones), [milestones]);
  const range = maxEnd - minStart;

  if (!items.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[1]" data-testid="waterfall-milestone-overlay">
      {items.map((item) => {
        const leftPct = range > 0 ? ((item.value - minStart) / range) * 100 : 0;
        if (leftPct < 0 || leftPct > 100) return null;
        return (
          <div
            key={item.key}
            className="absolute top-0 bottom-0 w-px bg-primary/60"
            style={{ left: `${leftPct}%` }}
            title={`${item.label}: ${formatMs(item.value)}`}
          />
        );
      })}
    </div>
  );
}

type TimeAxisProps = {
  minStart: number;
  maxEnd: number;
  milestones?: WaterfallMilestones;
};

function TimeAxis({ minStart, maxEnd, milestones }: TimeAxisProps) {
  const ticks = useMemo(() => buildTimeAxisTicks(minStart, maxEnd, 5), [minStart, maxEnd]);
  const milestoneItems = useMemo(() => getMilestoneItems(milestones), [milestones]);
  const range = maxEnd - minStart;

  return (
    <div
      className="relative w-full min-w-0 border-b border-slate-200/60 dark:border-slate-700/60 pb-1"
      data-testid="waterfall-timeline"
    >
      <div className="relative h-6">
        {ticks.map((tick) => {
          const leftPct = range > 0 ? ((tick - minStart) / range) * 100 : 0;
          return (
            <span
              key={tick}
              className="absolute -translate-x-1/2 tabular-nums text-xs text-muted-foreground"
              style={{ left: `${leftPct}%` }}
            >
              {tick}ms
            </span>
          );
        })}
        {milestoneItems.map((item) => {
          const leftPct = range > 0 ? ((item.value - minStart) / range) * 100 : 0;
          if (leftPct < 0 || leftPct > 100) return null;
          return (
            <span
              key={item.key}
              className="absolute -translate-x-1/2 text-[10px] font-medium text-primary whitespace-nowrap"
              style={{ left: `${leftPct}%` }}
              title={`${item.label}: ${formatMs(item.value)}`}
            >
              {item.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

type RowMetaProps = {
  row: NetworkWaterfallRow;
  compact?: boolean;
};

function RowMeta({ row, compact }: RowMetaProps) {
  const displayUrl = shortenUrl(row.url);
  const sizeLabel =
    row.transferSize != null && row.transferSize > 0 ? formatBytes(row.transferSize) : null;

  return (
    <div className={cn("min-w-0", compact ? "space-y-1" : "pr-2")}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm" title={row.url}>
          {displayUrl}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5">{toTitleCase(row.resourceType)}</span>
        {sizeLabel ? <span className="tabular-nums">{sizeLabel}</span> : null}
        {row.statusCode != null ? <span className="tabular-nums">{row.statusCode}</span> : null}
      </div>
    </div>
  );
}

type RowDetailProps = {
  row: NetworkWaterfallRow;
};

function RowDetail({ row }: RowDetailProps) {
  const queueMs =
    row.queueStart != null && row.queueEnd != null ? row.queueEnd - row.queueStart : null;

  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <p className="break-all text-foreground">{row.url}</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
        {queueMs != null ? <span>Queue: {formatMs(queueMs)}</span> : null}
        <span>Network: {formatMs(row.networkEnd - row.networkStart)}</span>
        <span>Total: {formatMs(row.duration)}</span>
        {row.transferSize != null ? <span>Transfer: {formatBytes(row.transferSize)}</span> : null}
        {row.statusCode != null ? <span>Status: {row.statusCode}</span> : null}
      </div>
    </div>
  );
}

export function InteractiveNetworkWaterfall({
  rows,
  timeRange,
  milestones,
  selectedId,
  onSelectRow,
}: InteractiveNetworkWaterfallProps) {
  const { minStart, maxEnd } = timeRange;
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;

  const handleRowActivate = useCallback(
    (id: string) => {
      onSelectRow?.(selectedId === id ? null : id);
    },
    [onSelectRow, selectedId],
  );

  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No requests match the current filters.
      </p>
    );
  }

  return (
    <div className="w-full min-w-0" data-testid="interactive-network-waterfall">
      <div
        className="max-h-[60vh] overflow-y-auto touch-pan-y rounded-md border border-border/50"
        data-testid="waterfall-scroll-container"
        style={{ touchAction: "pan-y" }}
      >
        {/* Desktop: labels + timeline grid */}
        <div
          className="hidden md:grid w-full min-w-0"
          style={{
            gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px minmax(0, 1fr)`,
            gridTemplateRows: `auto repeat(${rows.length}, auto)`,
          }}
        >
          <div
            className="sticky top-0 left-0 z-30 border-b bg-card px-2 py-2 text-xs font-medium text-muted-foreground"
            style={{ gridRow: 1, gridColumn: 1 }}
          >
            Request
          </div>
          <div
            className="sticky top-0 z-20 border-b bg-card px-1 py-1"
            style={{ gridRow: 1, gridColumn: 2 }}
          >
            <TimeAxis
              minStart={minStart}
              maxEnd={maxEnd}
              milestones={milestones}
            />
          </div>

          <div
            className="relative z-[1]"
            style={{ gridColumn: 2, gridRow: `2 / ${rows.length + 2}` }}
          >
            <MilestoneOverlay minStart={minStart} maxEnd={maxEnd} milestones={milestones} />
          </div>

          {rows.map((row, index) => {
            const isSelected = selectedId === row.id;
            const gridRow = index + 2;
            return (
              <Fragment key={row.id}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-selected={isSelected}
                  style={{ gridRow, gridColumn: 1 }}
                  className={cn(
                    "sticky left-0 z-10 border-b px-2 py-2 outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    isSelected ? "bg-muted/50" : "bg-card hover:bg-muted/30",
                  )}
                  onClick={() => handleRowActivate(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleRowActivate(row.id);
                    }
                  }}
                >
                  <RowMeta row={row} />
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  aria-selected={isSelected}
                  style={{ gridRow, gridColumn: 2 }}
                  className={cn(
                    "relative z-[2] border-b px-1 py-2 outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    isSelected ? "bg-muted/50" : "hover:bg-muted/30",
                  )}
                  onClick={() => handleRowActivate(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleRowActivate(row.id);
                    }
                  }}
                >
                  <WaterfallBarTrack
                    row={row}
                    minStart={minStart}
                    maxEnd={maxEnd}
                  />
                </div>
              </Fragment>
            );
          })}
        </div>

        {/* Mobile: timeline on top, stacked rows — same unified scroll */}
        <div className="relative md:hidden w-full min-w-0">
          <div className="sticky top-0 z-20 border-b bg-card px-1 py-1">
            <TimeAxis
              minStart={minStart}
              maxEnd={maxEnd}
              milestones={milestones}
            />
          </div>

          <div className="relative">
            <MilestoneOverlay minStart={minStart} maxEnd={maxEnd} milestones={milestones} />

            {rows.map((row) => {
              const isSelected = selectedId === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  className={cn(
                    "relative z-[2] w-full border-b px-1 py-2 text-left transition-colors min-h-11",
                    isSelected ? "bg-muted/50" : "hover:bg-muted/30",
                  )}
                  aria-selected={isSelected}
                  onClick={() => handleRowActivate(row.id)}
                >
                  <RowMeta row={row} compact />
                  <div className="mt-2">
                    <WaterfallBarTrack
                      row={row}
                      minStart={minStart}
                      maxEnd={maxEnd}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedRow ? (
        <div className="mt-3" data-testid="waterfall-row-detail">
          <RowDetail row={selectedRow} />
        </div>
      ) : null}
    </div>
  );
}
