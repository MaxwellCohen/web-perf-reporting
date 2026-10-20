"use client";

import { Fragment } from "react";
import type { WaterfallRow } from "@/features/page-speed-insights/waterfall/waterfallData";
import type { NetworkRequestTimeRange } from "@/features/page-speed-insights/shared/networkRequestsTable";
import { getNetworkBarColor } from "@/features/page-speed-insights/shared/networkResourceColors";
import {
  formatBytes,
  formatMs,
  formatNetworkPriority,
} from "@/features/page-speed-insights/shared/format";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import {
  GuideOverlay,
  type WaterfallGuide,
  type WaterfallMilestones,
  guidesFromMilestones,
} from "@/features/page-speed-insights/waterfall/guides";
import { TickGridOverlay, TimeAxis } from "@/features/page-speed-insights/waterfall/timeAxis";
import {
  rowCriticalChainMark,
  WaterfallBarTrack,
} from "@/features/page-speed-insights/waterfall/WaterfallBarTrack";
import { RenderBlockingBadge } from "@/features/page-speed-insights/waterfall/renderBlockingBadge";
import { cn } from "@/lib/utils";

export type { WaterfallMilestones, WaterfallGuide };

export type WaterfallHeightSize = "default" | "large" | "xl" | "full";

const WATERFALL_HEIGHT_CLASS: Record<WaterfallHeightSize, string> = {
  default: "max-h-[60vh]",
  large: "max-h-[80vh]",
  xl: "max-h-[90vh]",
  full: "max-h-none",
};

type InteractiveWaterfallProps = {
  rows: WaterfallRow[];
  timeRange: NetworkRequestTimeRange;
  milestones?: WaterfallMilestones;
  guides?: WaterfallGuide[];
  selectedId?: string | null;
  onSelectRow?: (id: string | null) => void;
  /** Called when a row is activated and has a momentId (scroll-to-moment). */
  onActivateMoment?: (momentId: string) => void;
  heightSize?: WaterfallHeightSize;
  /** Use timeline overview test ids on axis/guides. */
  overview?: boolean;
  emptyMessage?: string;
};

const LABEL_COLUMN_WIDTH = 220;
const META_COLUMN_WIDTH = 72;
const URL_PROTOCOL_REGEX = /^https?:\/\//;
const FILENAME_RESOURCE_TYPES = new Set(["Script", "Stylesheet", "Font", "Image", "Media"]);

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

function displayLabel(row: WaterfallRow): string {
  if (row.kind === "request" && row.url) {
    return shortenUrl(row.url, row.resourceType);
  }
  if (row.kind === "request-group" && row.url) {
    return shortenUrl(row.url, row.resourceType);
  }
  return row.label;
}

function swatchClass(row: WaterfallRow): string {
  if (row.kind === "task") {
    const hasLong = row.segments?.some((seg) => seg.taskKind === "long");
    return hasLong ? "bg-rose-500/85" : "bg-amber-400/90 dark:bg-amber-400/80";
  }
  if (row.kind === "user-mark" || row.kind === "user-measure") {
    return "bg-teal-600/80 dark:bg-teal-400/70";
  }
  return getNetworkBarColor(row.resourceType);
}

function ResourceTypeSwatch({ row }: { row: WaterfallRow }) {
  return (
    <span
      className={cn("h-1.5 w-1.5 shrink-0 rounded-sm", swatchClass(row))}
      title={toTitleCase(row.resourceType)}
      aria-label={toTitleCase(row.resourceType)}
    />
  );
}

function RowTrailingMeta({ row }: { row: WaterfallRow }) {
  if (row.kind === "task" || row.kind === "user-mark" || row.kind === "user-measure") {
    return (
      <span className="shrink-0 tabular-nums text-[9px] leading-none text-muted-foreground">
        {formatMs(row.duration || 0)}
      </span>
    );
  }

  const sizeLabel =
    row.transferSize != null && row.transferSize > 0 ? formatBytes(row.transferSize) : "—";

  return (
    <span
      className="shrink-0 tabular-nums text-[9px] leading-none text-muted-foreground"
      style={{ width: META_COLUMN_WIDTH, textAlign: "right" }}
    >
      {sizeLabel}
      {row.statusCode != null ? ` · ${row.statusCode}` : ""}
    </span>
  );
}

function ChainChip({ row }: { row: WaterfallRow }) {
  const mark = rowCriticalChainMark(row);
  if (!mark) return null;
  return (
    <span
      className={cn(
        "shrink-0 rounded px-1 py-0.5 text-[10px] font-medium leading-none",
        mark === "longest"
          ? "bg-sky-500/20 text-sky-800 dark:text-sky-200"
          : "bg-sky-500/10 text-sky-700 dark:text-sky-300",
      )}
      data-testid="waterfall-chain-badge"
      data-critical-chain={mark}
    >
      {mark === "longest" ? "Critical path" : "Chain"}
    </span>
  );
}

function BlockingChip({ row }: { row: WaterfallRow }) {
  if (
    (row.kind !== "request" && row.kind !== "request-group" && row.kind !== "task") ||
    !row.renderBlocking ||
    row.renderBlocking === "non-blocking"
  ) {
    return null;
  }
  return <RenderBlockingBadge status={row.renderBlocking} compact />;
}

function mobileMetaValue(row: WaterfallRow): string {
  if (row.kind === "task" || row.kind === "user-mark" || row.kind === "user-measure") {
    return formatMs(row.duration || 0);
  }
  if (row.transferSize != null && row.transferSize > 0) {
    return formatBytes(row.transferSize);
  }
  return "";
}

function RowMeta({ row, layout = "desktop" }: { row: WaterfallRow; layout?: "desktop" | "mobile" }) {
  const label = displayLabel(row);

  if (layout === "mobile") {
    const meta = mobileMetaValue(row);
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <ResourceTypeSwatch row={row} />
        <p
          className="min-w-0 flex-1 truncate text-[12px] font-medium leading-tight"
          title={row.url ?? row.label}
        >
          {label}
        </p>
        <BlockingChip row={row} />
        <ChainChip row={row} />
        {meta ? (
          <span className="shrink-0 tabular-nums text-[10px] leading-none text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <ResourceTypeSwatch row={row} />
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <span className="min-w-0 truncate text-[11px] leading-none" title={row.url ?? row.label}>
          {label}
        </span>
        <BlockingChip row={row} />
        <ChainChip row={row} />
      </div>
      <RowTrailingMeta row={row} />
    </div>
  );
}

function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-background/80 px-2 py-0.5 tabular-nums">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}

function RowDetail({ row }: { row: WaterfallRow }) {
  const queueMs =
    row.queueStart != null && row.queueEnd != null ? row.queueEnd - row.queueStart : null;

  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-xs">
      <p className="break-all font-mono text-[11px] leading-relaxed text-foreground">
        {row.url ?? row.label}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <DetailChip label="Type" value={toTitleCase(row.resourceType)} />
        {row.renderBlocking && row.renderBlocking !== "non-blocking" ? (
          <RenderBlockingBadge status={row.renderBlocking} />
        ) : null}
        {queueMs != null ? <DetailChip label="Queue" value={formatMs(queueMs)} /> : null}
        {row.kind !== "user-mark" ? (
          <DetailChip
            label={row.kind === "task" ? "Tasks" : "Network"}
            value={formatMs(row.networkEnd - row.networkStart)}
          />
        ) : (
          <DetailChip label="At" value={formatMs(row.networkStart)} />
        )}
        <DetailChip label="Total" value={formatMs(row.duration)} />
        {row.transferSize != null ? (
          <DetailChip label="Transfer" value={formatBytes(row.transferSize)} />
        ) : null}
        {row.resourceSize != null ? (
          <DetailChip label="Resource" value={formatBytes(row.resourceSize)} />
        ) : null}
        {row.statusCode != null ? (
          <DetailChip label="Status" value={String(row.statusCode)} />
        ) : null}
        {row.priority ? (
          <DetailChip label="Priority" value={formatNetworkPriority(row.priority)} />
        ) : null}
        {row.protocol ? <DetailChip label="Protocol" value={row.protocol} /> : null}
        {row.coverage ? <DetailChip label="Coverage" value={row.coverage} /> : null}
        {row.isCriticalChain ? <DetailChip label="Chain" value="Critical" /> : null}
        {row.isLinkPreload ? <DetailChip label="Preload" value="Yes" /> : null}
        {row.segments && row.segments.length > 1 ? (
          <DetailChip label="Bars" value={String(row.segments.length)} />
        ) : null}
      </div>
    </div>
  );
}

export function InteractiveWaterfall({
  rows,
  timeRange,
  milestones,
  guides: guidesProp,
  selectedId,
  onSelectRow,
  onActivateMoment,
  heightSize = "default",
  overview = false,
  emptyMessage = "No requests match the current filters.",
}: InteractiveWaterfallProps) {
  const { minStart, maxEnd } = timeRange;
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;
  const guides = guidesProp ?? guidesFromMilestones(milestones);

  const handleRowActivate = (row: WaterfallRow) => {
    const nextId = selectedId === row.id ? null : row.id;
    onSelectRow?.(nextId);
    if (nextId != null && row.momentId) {
      onActivateMoment?.(row.momentId);
    }
  };

  if (!rows.length && !guides.length) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground" data-testid="overview-lanes">
        {emptyMessage}
      </p>
    );
  }

  const rowCount = Math.max(rows.length, 0);

  return (
    <div
      className="w-full min-w-0"
      data-testid={overview ? "overview-lanes" : "interactive-network-waterfall"}
    >
      <div
        className={cn(
          "touch-pan-y overflow-y-auto rounded-md border border-border/50",
          WATERFALL_HEIGHT_CLASS[heightSize],
        )}
        data-testid="waterfall-scroll-container"
        data-height-size={heightSize}
        style={{ touchAction: "pan-y" }}
      >
        {!rows.length ? (
          <div className="space-y-2 px-2 py-2">
            <TimeAxis
              minStart={minStart}
              maxEnd={maxEnd}
              milestones={milestones}
              guides={overview ? guides : undefined}
              overview={overview}
            />
            <div className="relative h-16">
              <TickGridOverlay minStart={minStart} maxEnd={maxEnd} overview={overview} />
              <GuideOverlay
                minStart={minStart}
                maxEnd={maxEnd}
                guides={guides}
                testId={overview ? "overview-guide-lines" : "waterfall-milestone-overlay"}
              />
            </div>
            <p className="py-2 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : null}

        <div
          className={cn("hidden w-full min-w-0 lg:grid", !rows.length && "lg:hidden")}
          style={{
            gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px minmax(0, 1fr)`,
            gridTemplateRows: `auto repeat(${rowCount}, auto)`,
          }}
        >
          <div
            className="sticky top-0 left-0 z-30 border-b bg-card px-1.5 py-1 text-[10px] font-medium text-muted-foreground"
            style={{ gridRow: 1, gridColumn: 1 }}
          >
            <div className="flex items-center justify-between gap-1">
              <span>Request</span>
              <span
                className="tabular-nums"
                style={{ width: META_COLUMN_WIDTH, textAlign: "right" }}
              >
                Size
              </span>
            </div>
          </div>
          <div
            className="sticky top-0 z-20 border-b bg-card px-1 py-1"
            style={{ gridRow: 1, gridColumn: 2 }}
          >
            <TimeAxis
              minStart={minStart}
              maxEnd={maxEnd}
              milestones={milestones}
              guides={overview ? guides : undefined}
              overview={overview}
            />
          </div>

          <div
            className="relative z-1"
            style={{ gridColumn: 2, gridRow: `2 / ${rowCount + 2}` }}
          >
            <TickGridOverlay minStart={minStart} maxEnd={maxEnd} overview={overview} />
            <GuideOverlay
              minStart={minStart}
              maxEnd={maxEnd}
              guides={guides}
              testId={overview ? "overview-guide-lines" : "waterfall-milestone-overlay"}
            />
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
                    "group sticky left-0 z-10 cursor-pointer border-b border-border/30 px-1.5 py-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    isSelected ? "bg-muted/60" : "bg-card hover:bg-muted/30",
                  )}
                  onClick={() => handleRowActivate(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleRowActivate(row);
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
                    "group relative z-2 flex cursor-pointer items-center border-b border-border/30 px-1 py-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    isSelected ? "bg-muted/60" : "hover:bg-muted/30",
                  )}
                  onClick={() => handleRowActivate(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleRowActivate(row);
                    }
                  }}
                >
                  <WaterfallBarTrack row={row} minStart={minStart} maxEnd={maxEnd} />
                </div>
              </Fragment>
            );
          })}
        </div>

        <div className={cn("relative w-full min-w-0 lg:hidden", !rows.length && "hidden")}>
          <div className="sticky top-0 z-20 border-b bg-card px-2 py-1.5">
            <TimeAxis
              minStart={minStart}
              maxEnd={maxEnd}
              milestones={milestones}
              guides={overview ? guides : undefined}
              overview={overview}
            />
          </div>

          <div className="relative">
            {/* Milestone guides stay desktop-only — on stacked mobile they cut through
                row labels. TimeAxis chip legend still lists the same milestones. */}
            <TickGridOverlay
              minStart={minStart}
              maxEnd={maxEnd}
              overview={overview}
              tickCount={3}
            />

            {rows.map((row) => {
              const isSelected = selectedId === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  className={cn(
                    "group relative z-2 w-full border-b border-border/30 px-2 py-1.5 text-left transition-colors",
                    isSelected ? "bg-muted/60" : "hover:bg-muted/30",
                  )}
                  aria-selected={isSelected}
                  onClick={() => handleRowActivate(row)}
                >
                  {/* Opaque label strip so faint tick lines don't slice through text. */}
                  <div
                    className={cn(
                      "relative z-2 -mx-2 -mt-1.5 px-2 pt-1.5",
                      isSelected ? "bg-muted/60" : "bg-card group-hover:bg-muted/30",
                    )}
                  >
                    <RowMeta row={row} layout="mobile" />
                  </div>
                  <div className="relative mt-1.5">
                    <WaterfallBarTrack row={row} minStart={minStart} maxEnd={maxEnd} height={10} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedRow ? (
        <div className="mt-2" data-testid="waterfall-row-detail">
          <RowDetail row={selectedRow} />
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Use InteractiveWaterfall */
export const InteractiveNetworkWaterfall = InteractiveWaterfall;
