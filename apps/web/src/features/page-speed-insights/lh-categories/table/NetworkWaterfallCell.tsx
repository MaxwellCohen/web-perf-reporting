"use client";

import { getNetworkBarColor } from "@/features/page-speed-insights/shared/networkResourceColors";

type NetworkWaterfallCellProps = {
  /** Start time in ms (e.g. networkRequestTime) */
  requestTime: number;
  /** End time in ms (e.g. networkEndTime) */
  endTime: number;
  /** Min start time across all requests (for scale) */
  minStart: number;
  /** Max end time across all requests (for scale) */
  maxEnd: number;
  /** Optional resource type for color (Document, Script, Stylesheet, Font, Image, etc.) */
  resourceType?: string;
  /** Width of the waterfall track in pixels */
  width?: number;
  /** Height of each bar in pixels */
  barHeight?: number;
  /** Show start and end time labels on the waterfall */
  showTimeLabels?: boolean;
};

/**
 * Renders a single horizontal bar in a network waterfall (request start → end on a time axis).
 */
export function NetworkWaterfallCell({
  requestTime,
  endTime,
  minStart,
  maxEnd,
  resourceType,
  width = 280,
  barHeight = 16,
  showTimeLabels = false,
}: NetworkWaterfallCellProps) {
  const range = maxEnd - minStart;
  const duration = Math.max(0, endTime - requestTime);
  const startMs = Math.round(requestTime);
  const endMs = Math.round(endTime);

  if (range <= 0) {
    return (
      <div className="w-full" title="No timing range">
        {showTimeLabels && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {startMs} → {endMs} ms
          </span>
        )}
      </div>
    );
  }

  const leftPct = ((requestTime - minStart) / range) * 100;
  const widthPct = (duration / range) * 100;
  const minWidthPct = (2 / range) * 100; // at least 2ms visible

  const colorClass = getNetworkBarColor(resourceType);

  return (
    <div className="flex flex-col gap-0.5 min-w-0" style={{ width }}>
      <div
        className="relative rounded-md overflow-hidden bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shrink-0"
        style={{ height: barHeight }}
        title={`${startMs} – ${endMs} ms (${Math.round(duration)} ms)`}
      >
        <div
          className={`absolute top-0 bottom-0 rounded-[3px] ${colorClass} shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-opacity hover:opacity-100 opacity-95`}
          style={{
            left: `${leftPct}%`,
            width: `${Math.max(widthPct, minWidthPct)}%`,
            minWidth: 3,
          }}
        />
      </div>
      {showTimeLabels && (
        <span className="text-[10px] text-muted-foreground tabular-nums leading-tight">
          {startMs} → {endMs} ms
        </span>
      )}
    </div>
  );
}
