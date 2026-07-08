import {
  getNetworkRequestsTimeRange,
  type NetworkRequestTimeRange,
} from "@/features/page-speed-insights/shared/networkRequestsTable";
import type { TableItem } from "@/lib/schema";
import { getNumber, getUrlString } from "@/lib/utils";

export type NetworkWaterfallRow = {
  id: string;
  url: string;
  resourceType: string;
  statusCode?: number;
  transferSize?: number;
  networkStart: number;
  networkEnd: number;
  queueStart?: number;
  queueEnd?: number;
  duration: number;
};

export type WaterfallSortBy = "start" | "duration" | "size";

export type WaterfallFilterOptions = {
  resourceTypes?: string[];
  search?: string;
};

export function normalizeNetworkRequest(row: TableItem, index: number): NetworkWaterfallRow {
  const networkStart = getNumber(row.networkRequestTime) ?? 0;
  const networkEnd = getNumber(row.networkEndTime) ?? networkStart;
  const rendererStart = getNumber(row.rendererStartTime);
  const url = getUrlString(row.url) || "Unknown";
  const resourceType =
    typeof row.resourceType === "string" && row.resourceType.length > 0
      ? row.resourceType
      : "Other";

  let queueStart: number | undefined;
  let queueEnd: number | undefined;

  if (
    rendererStart != null &&
    Number.isFinite(rendererStart) &&
    rendererStart < networkStart
  ) {
    queueStart = rendererStart;
    queueEnd = networkStart;
  }

  const duration = Math.max(0, networkEnd - (queueStart ?? networkStart));

  return {
    id: `${index}-${networkStart}-${url}`,
    url,
    resourceType,
    statusCode: getNumber(row.statusCode),
    transferSize: getNumber(row.transferSize),
    networkStart,
    networkEnd,
    queueStart,
    queueEnd,
    duration,
  };
}

export function buildWaterfallRows(requests: TableItem[]): NetworkWaterfallRow[] {
  return requests.map((row, index) => normalizeNetworkRequest(row, index));
}

export function getWaterfallTimeRange(
  rows: NetworkWaterfallRow[],
): NetworkRequestTimeRange | null {
  if (!rows.length) {
    return null;
  }

  return getNetworkRequestsTimeRange(
    rows.map((row) => ({
      networkRequestTime: row.queueStart ?? row.networkStart,
      networkEndTime: row.networkEnd,
    })),
  );
}

export function filterWaterfallRows(
  rows: NetworkWaterfallRow[],
  { resourceTypes, search }: WaterfallFilterOptions,
): NetworkWaterfallRow[] {
  let filtered = rows;

  if (resourceTypes && resourceTypes.length > 0) {
    const typeSet = new Set(resourceTypes);
    filtered = filtered.filter((row) => typeSet.has(row.resourceType));
  }

  const query = search?.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter((row) => row.url.toLowerCase().includes(query));
  }

  return filtered;
}

export function sortWaterfallRows(
  rows: NetworkWaterfallRow[],
  sortBy: WaterfallSortBy,
): NetworkWaterfallRow[] {
  const sorted = [...rows];

  switch (sortBy) {
    case "duration":
      sorted.sort((a, b) => b.duration - a.duration || a.networkStart - b.networkStart);
      break;
    case "size":
      sorted.sort(
        (a, b) =>
          (b.transferSize ?? 0) - (a.transferSize ?? 0) || a.networkStart - b.networkStart,
      );
      break;
    case "start":
    default:
      sorted.sort((a, b) => a.networkStart - b.networkStart || a.url.localeCompare(b.url));
      break;
  }

  return sorted;
}

export function getWaterfallResourceTypes(rows: NetworkWaterfallRow[]): string[] {
  return [...new Set(rows.map((row) => row.resourceType))].sort();
}

export function getSegmentStyle(
  start: number,
  end: number,
  minStart: number,
  maxEnd: number,
): { left: string; width: string } {
  const range = maxEnd - minStart;
  if (range <= 0) {
    return { left: "0%", width: "0%" };
  }

  const leftPct = ((start - minStart) / range) * 100;
  const widthPct = Math.max(((end - start) / range) * 100, (2 / range) * 100);

  return {
    left: `${leftPct}%`,
    width: `${widthPct}%`,
  };
}

function niceTickStep(roughStep: number): number {
  const power = 10 ** Math.floor(Math.log10(roughStep));
  const error = roughStep / power;
  if (error >= Math.sqrt(50)) return 10 * power;
  if (error >= Math.sqrt(10)) return 5 * power;
  if (error >= Math.sqrt(2)) return 2 * power;
  return power;
}

export function buildTimeAxisTicks(minStart: number, maxEnd: number, tickCount = 5): number[] {
  const range = maxEnd - minStart;
  if (range <= 0) {
    return [minStart];
  }

  const roughStep = range / Math.max(1, tickCount - 1);
  const step = niceTickStep(roughStep);
  const start = Math.floor(minStart / step) * step;
  const end = Math.ceil(maxEnd / step) * step;

  const ticks: number[] = [];
  for (let tick = start; tick <= end + step * 1e-9; tick += step) {
    ticks.push(Math.round(tick));
  }
  return ticks;
}
