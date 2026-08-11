"use client";

import { Fragment } from "react";
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

export type WaterfallHeightSize = "default" | "large" | "xl" | "full";

const WATERFALL_HEIGHT_CLASS: Record<WaterfallHeightSize, string> = {
  default: "max-h-[60vh]",
  large: "max-h-[80vh]",
  xl: "max-h-[90vh]",
  full: "max-h-none",
};

type InteractiveNetworkWaterfallProps = {
  rows: NetworkWaterfallRow[];
  timeRange: NetworkRequestTimeRange;
  milestones?: WaterfallMilestones;
  selectedId?: string | null;
  onSelectRow?: (id: string | null) => void;
  heightSize?: WaterfallHeightSize;
};

const BAR_HEIGHT = 12;
const LABEL_COLUMN_WIDTH = 280;
const META_COLUMN_WIDTH = 88;
const URL_PROTOCOL_REGEX = /^https?:\/\//;
const FILENAME_RESOURCE_TYPES = new Set(["Script", "Stylesheet", "Font", "Image", "Media"]);

const MILESTONE_LINE_CLASS: Record<string, string> = {
  fcp: "border-l border-dashed border-emerald-500/70",
  lcp: "border-l border-dashed border-amber-500/80",
  dcl: "border-l border-dashed border-sky-500/70",
};

const MILESTONE_DOT_CLASS: Record<string, string> = {
  fcp: "bg-emerald-500",
  lcp: "bg-amber-500",
  dcl: "bg-sky-500",
};

function shortenUrl(url: string, resourceType: string): string {
  const withoutProtocol = url.replace(URL_PROTOCOL_REGEX, "");
  if (!FILENAME_RESOURCE_TYPES.has(resourceType)) {
    return withoutProtocol;
  }

  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${withoutProtocol}`);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const filename = segments.at(-1);
    if (filename && filename.includes(".")) {
      return filename.length > 48 ? `${filename.slice(0, 45)}…` : filename;
    }
  } catch {
    // fall through to host/path
  }

  return withoutProtocol;
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
      className="relative w-full min-w-0 overflow-hidden rounded-sm bg-muted/40 group-hover:bg-muted/55"
      style={{ height: BAR_HEIGHT }}
    >
      {queueStyle ? (
        <div
          className={cn("absolute top-0 bottom-0 rounded-xs", QUEUE_SEGMENT_COLOR)}
          style={queueStyle}
          aria-label={`Queue ${formatMs(row.queueEnd! - row.queueStart!)}`}
        />
      ) : null}
      <div
        className={cn(
          "absolute top-0 bottom-0 rounded-xs opacity-90 group-hover:opacity-100",
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
    items.push({
      key: "dcl",
      label: "DCL",
      value: milestones.domContentLoaded,
    });
  }
  return items;
}

type TickGridOverlayProps = {
  minStart: number;
  maxEnd: number;
};

function TickGridOverlay({ minStart, maxEnd }: TickGridOverlayProps) {
  const ticks = buildTimeAxisTicks(minStart, maxEnd, 5);
  const range = maxEnd - minStart;
  if (range <= 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0"
      data-testid="waterfall-tick-grid"
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

type MilestoneOverlayProps = {
  minStart: number;
  maxEnd: number;
  milestones?: WaterfallMilestones;
};

function MilestoneOverlay({ minStart, maxEnd, milestones }: MilestoneOverlayProps) {
  const items = getMilestoneItems(milestones);
  const range = maxEnd - minStart;

  if (!items.length) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-1"
      data-testid="waterfall-milestone-overlay"
    >
      {items.map((item) => {
        const leftPct = range > 0 ? ((item.value - minStart) / range) * 100 : 0;
        if (leftPct < 0 || leftPct > 100) return null;
        return (
          <div
            key={item.key}
            className={cn(
              "absolute top-0 bottom-0 w-0",
              MILESTONE_LINE_CLASS[item.key] ?? "border-l border-dashed border-primary/60",
            )}
            style={{ left: `${leftPct}%` }}
            title={`${item.label}: ${formatMs(item.value)}`}
          />
        );
      })}
    </div>
  );
}

function MilestoneLegend({ milestones }: { milestones?: WaterfallMilestones }) {
  const items = getMilestoneItems(milestones);
  if (!items.length) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-0.5"
      data-testid="waterfall-milestone-legend"
    >
      {items.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground"
          title={`${item.label}: ${formatMs(item.value)}`}
        >
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              MILESTONE_DOT_CLASS[item.key] ?? "bg-primary",
            )}
          />
          {item.label}
          <span className="tabular-nums font-normal">{formatMs(item.value)}</span>
        </span>
      ))}
    </div>
  );
}

type TimeAxisProps = {
  minStart: number;
  maxEnd: number;
  milestones?: WaterfallMilestones;
};

function TimeAxis({ minStart, maxEnd, milestones }: TimeAxisProps) {
  const ticks = buildTimeAxisTicks(minStart, maxEnd, 5);

  return (
    <div className="relative w-full min-w-0 space-y-1" data-testid="waterfall-timeline">
      <div className="relative h-4">
        {ticks.map((tick, index) => (
          <TimeAxisTick key={tick} tick={tick} index={index} minStart={minStart} maxEnd={maxEnd} />
        ))}
      </div>
      <MilestoneLegend milestones={milestones} />
    </div>
  );
}

function TimeAxisTick({
  tick,
  index,
  minStart,
  maxEnd,
}: {
  tick: number;
  index: number;
  minStart: number;
  maxEnd: number;
}) {
  const range = maxEnd - minStart;
  if (range <= 0) return null;
  const leftPct = ((tick - minStart) / range) * 100;
  if (leftPct < 0 || leftPct > 100) return null;
  return (
    <span
      className={cn("absolute -translate-x-1/2 tabular-nums text-[11px] text-muted-foreground", {
        "pl-[3ch]": !index,
      })}
      style={{ left: `${leftPct}%` }}
    >
      {tick}ms
    </span>
  );
}

type RowMetaProps = {
  row: NetworkWaterfallRow;
  layout?: "desktop" | "mobile";
};

function ResourceTypeSwatch({ resourceType }: { resourceType: string }) {
  return (
    <span
      className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-sm", getNetworkBarColor(resourceType))}
      title={toTitleCase(resourceType)}
      aria-label={toTitleCase(resourceType)}
    />
  );
}

function RowTrailingMeta({ row }: { row: NetworkWaterfallRow }) {
  const sizeLabel =
    row.transferSize != null && row.transferSize > 0 ? formatBytes(row.transferSize) : "—";

  return (
    <div className="flex shrink-0 flex-col items-end gap-0.5 tabular-nums text-[10px] leading-tight text-muted-foreground">
      <span>{sizeLabel}</span>
      {row.statusCode != null ? <span>{row.statusCode}</span> : null}
    </div>
  );
}

function RowMeta({ row, layout = "desktop" }: RowMetaProps) {
  const displayUrl = shortenUrl(row.url, row.resourceType);

  if (layout === "mobile") {
    return (
      <div className="flex min-w-0 items-start gap-2">
        <ResourceTypeSwatch resourceType={row.resourceType} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium" title={row.url}>
            {displayUrl}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] tabular-nums text-muted-foreground">
            <span>{toTitleCase(row.resourceType)}</span>
            {row.transferSize != null && row.transferSize > 0 ? (
              <span>{formatBytes(row.transferSize)}</span>
            ) : null}
            {row.statusCode != null ? <span>{row.statusCode}</span> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-start gap-2 pr-1">
      <ResourceTypeSwatch resourceType={row.resourceType} />
      <span className="min-w-0 flex-1 truncate text-xs leading-4" title={row.url}>
        {displayUrl}
      </span>
      <RowTrailingMeta row={row} />
    </div>
  );
}

type RowDetailProps = {
  row: NetworkWaterfallRow;
};

function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-background/80 px-2 py-0.5 tabular-nums">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}

function RowDetail({ row }: RowDetailProps) {
  const queueMs =
    row.queueStart != null && row.queueEnd != null ? row.queueEnd - row.queueStart : null;

  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-xs">
      <p className="break-all font-mono text-[11px] leading-relaxed text-foreground">{row.url}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <DetailChip label="Type" value={toTitleCase(row.resourceType)} />
        {queueMs != null ? <DetailChip label="Queue" value={formatMs(queueMs)} /> : null}
        <DetailChip label="Network" value={formatMs(row.networkEnd - row.networkStart)} />
        <DetailChip label="Total" value={formatMs(row.duration)} />
        {row.transferSize != null ? (
          <DetailChip label="Transfer" value={formatBytes(row.transferSize)} />
        ) : null}
        {row.statusCode != null ? (
          <DetailChip label="Status" value={String(row.statusCode)} />
        ) : null}
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
  heightSize = "default",
}: InteractiveNetworkWaterfallProps) {
  const { minStart, maxEnd } = timeRange;
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;

  const handleRowActivate = (id: string) => {
    onSelectRow?.(selectedId === id ? null : id);
  };

  if (!rows.length) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No requests match the current filters.
      </p>
    );
  }

  return (
    <div className="w-full min-w-0" data-testid="interactive-network-waterfall">
      <div
        className={cn(
          "touch-pan-y overflow-y-auto rounded-md border border-border/50",
          WATERFALL_HEIGHT_CLASS[heightSize],
        )}
        data-testid="waterfall-scroll-container"
        data-height-size={heightSize}
        style={{ touchAction: "pan-y" }}
      >
        {/* Desktop: labels + timeline grid */}
        <div
          className="hidden w-full min-w-0 md:grid"
          style={{
            gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px minmax(0, 1fr)`,
            gridTemplateRows: `auto repeat(${rows.length}, auto)`,
          }}
        >
          <div
            className="sticky top-0 left-0 z-30 border-b bg-card px-2 py-1.5 text-[11px] font-medium text-muted-foreground"
            style={{ gridRow: 1, gridColumn: 1 }}
          >
            <div className="flex items-center justify-between gap-2">
              <span>Request</span>
              <span
                className="tabular-nums"
                style={{ width: META_COLUMN_WIDTH, textAlign: "right" }}
              >
                Size / Status
              </span>
            </div>
          </div>
          <div
            className="sticky top-0 z-20 border-b bg-card px-1 py-1.5"
            style={{ gridRow: 1, gridColumn: 2 }}
          >
            <TimeAxis minStart={minStart} maxEnd={maxEnd} milestones={milestones} />
          </div>

          <div
            className="relative z-1"
            style={{ gridColumn: 2, gridRow: `2 / ${rows.length + 2}` }}
          >
            <TickGridOverlay minStart={minStart} maxEnd={maxEnd} />
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
                    "group sticky left-0 z-10 cursor-pointer border-b border-border/40 px-2 py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    isSelected ? "bg-muted/60" : "bg-card hover:bg-muted/30",
                  )}
                  onClick={() => handleRowActivate(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleRowActivate(row.id);
                    }
                  }}
                >
                  <RowMeta row={row} layout="desktop" />
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  aria-selected={isSelected}
                  style={{ gridRow, gridColumn: 2 }}
                  className={cn(
                    "group relative z-2 cursor-pointer border-b border-border/40 px-1 py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    isSelected ? "bg-muted/60" : "hover:bg-muted/30",
                  )}
                  onClick={() => handleRowActivate(row.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleRowActivate(row.id);
                    }
                  }}
                >
                  <WaterfallBarTrack row={row} minStart={minStart} maxEnd={maxEnd} />
                </div>
              </Fragment>
            );
          })}
        </div>

        {/* Mobile: timeline on top, stacked rows — same unified scroll */}
        <div className="relative w-full min-w-0 md:hidden">
          <div className="sticky top-0 z-20 border-b bg-card px-1 py-1.5">
            <TimeAxis minStart={minStart} maxEnd={maxEnd} milestones={milestones} />
          </div>

          <div className="relative">
            <TickGridOverlay minStart={minStart} maxEnd={maxEnd} />
            <MilestoneOverlay minStart={minStart} maxEnd={maxEnd} milestones={milestones} />

            {rows.map((row) => {
              const isSelected = selectedId === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  className={cn(
                    "group relative z-2 min-h-11 w-full border-b border-border/40 px-1.5 py-1.5 text-left transition-colors",
                    isSelected ? "bg-muted/60" : "hover:bg-muted/30",
                  )}
                  aria-selected={isSelected}
                  onClick={() => handleRowActivate(row.id)}
                >
                  <RowMeta row={row} layout="mobile" />
                  <div className="mt-1.5">
                    <WaterfallBarTrack row={row} minStart={minStart} maxEnd={maxEnd} />
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
