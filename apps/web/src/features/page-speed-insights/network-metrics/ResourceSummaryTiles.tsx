"use client";

import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { collectResourceSummaries } from "@/features/page-speed-insights/network-metrics/resourceSummary";
import type { ResourceSummaryTile } from "@/features/page-speed-insights/network-metrics/resourceSummary";
import { formatBytes } from "@/features/page-speed-insights/shared/format";
import { getNetworkBarColor } from "@/features/page-speed-insights/shared/networkResourceColors";
import { cn } from "@/lib/utils";

function swatchClass(tile: ResourceSummaryTile): string {
  if (tile.resourceType === "total") return "bg-foreground";
  if (tile.resourceType === "third-party") return "bg-orange-500/90 dark:bg-orange-400/80";
  return getNetworkBarColor(tile.label);
}

function requestLabel(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? "request" : "requests"}`;
}

function SummaryTile({
  tile,
  share,
}: {
  tile: ResourceSummaryTile;
  share: number | null;
}) {
  const swatch = swatchClass(tile);

  return (
    <li
      data-resource-type={tile.resourceType}
      className="flex min-w-0 flex-col gap-1 rounded-lg border bg-muted/30 px-3 py-2"
    >
      <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className={cn("size-2 shrink-0 rounded-full", swatch)} aria-hidden />
        <span className="truncate">{tile.label}</span>
      </span>
      <span className="truncate font-mono text-base font-semibold tabular-nums">
        {formatBytes(tile.transferSize)}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{requestLabel(tile.requestCount)}</span>
      {share === null ? null : (
        <span className="mt-1 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <span className={cn("block h-full", swatch)} style={{ width: `${share * 100}%` }} />
        </span>
      )}
    </li>
  );
}

function shareOfTotal(tile: ResourceSummaryTile, totalBytes: number): number | null {
  if (tile.resourceType === "total" || tile.resourceType === "third-party") return null;
  if (totalBytes <= 0) return null;
  return Math.min(1, tile.transferSize / totalBytes);
}

export function ResourceSummaryTiles() {
  const summaries = collectResourceSummaries(usePageSpeedItems());
  if (!summaries.length) return null;

  const comparing = summaries.length > 1;

  return (
    <section aria-label="Resources Summary" className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">Resources Summary</h2>
      {summaries.map((summary) => {
        const totalBytes =
          summary.tiles.find((tile) => tile.resourceType === "total")?.transferSize ?? 0;

        return (
          <div key={summary.label} className="flex flex-col gap-2">
            {comparing ? (
              <h3 className="text-sm font-medium text-muted-foreground">{summary.label}</h3>
            ) : null}
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {summary.tiles.map((tile) => (
                <SummaryTile
                  key={tile.resourceType || tile.label}
                  tile={tile}
                  share={shareOfTotal(tile, totalBytes)}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
