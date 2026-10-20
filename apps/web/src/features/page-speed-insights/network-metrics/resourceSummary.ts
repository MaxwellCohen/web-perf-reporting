import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import type { ItemValue, TableItem } from "@/lib/schema";

export type ResourceSummaryTile = {
  resourceType: string;
  label: string;
  requestCount: number;
  transferSize: number;
};

export type ResourceSummary = {
  label: string;
  tiles: ResourceSummaryTile[];
};

function textValue(value: ItemValue | undefined): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: ItemValue | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toTile(row: TableItem): ResourceSummaryTile | null {
  const resourceType = textValue(row.resourceType);
  const label = textValue(row.label) || resourceType;
  if (!label) return null;

  const requestCount = numberValue(row.requestCount);
  const transferSize = numberValue(row.transferSize);
  if (requestCount === 0 && transferSize === 0) return null;

  return { resourceType, label, requestCount, transferSize };
}

function summaryTiles(item: InsightsContextItem["item"]): ResourceSummaryTile[] {
  const details = item.lighthouseResult?.audits?.["resource-summary"]?.details;
  if (!details || details.type !== "table") return [];

  return details.items.flatMap((row) => {
    const tile = toTile(row);
    return tile ? [tile] : [];
  });
}

export function collectResourceSummaries(items: InsightsContextItem[]): ResourceSummary[] {
  return items.flatMap(({ item, label }) => {
    const tiles = summaryTiles(item);
    return tiles.length ? [{ label, tiles }] : [];
  });
}
