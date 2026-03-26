import type { TableColumnHeading, TableItem } from "@/lib/schema";

type NetworkRequestRow = TableItem & {
  networkRequestTime?: number;
  networkEndTime?: number;
};

export type NetworkRequestTimeRange = {
  minStart: number;
  maxEnd: number;
};

export const NETWORK_REQUESTS_AUDIT_ID = "network-requests";
export const NETWORK_REQUEST_TIMING_KEYS: readonly string[] = [
  "networkRequestTime",
  "networkEndTime",
] as const;
export const WATERFALL_REPLACED_NETWORK_REQUEST_KEYS: readonly string[] = [
  ...NETWORK_REQUEST_TIMING_KEYS,
] as const;
export const NETWORK_REQUESTS_COLUMN_ORDER: readonly string[] = [
  "url",
  "statusCode",
  "protocol",
  "resourceType",
  "mimeType",
  "transferSize",
  "resourceSize",
] as const;

export function isNetworkRequestsAudit(auditId?: string): boolean {
  return auditId === NETWORK_REQUESTS_AUDIT_ID;
}

export function isNetworkRequestsTable(headings: TableColumnHeading[]): boolean {
  const keys = new Set(
    headings.map((heading) => heading.key).filter((key): key is string => key != null),
  );

  return NETWORK_REQUEST_TIMING_KEYS.every((key) => keys.has(key));
}

export function sortHeadingsByKeyOrder(
  headings: TableColumnHeading[],
  keyOrder: readonly string[],
): TableColumnHeading[] {
  const headingsByKey = new Map(headings.map((heading) => [heading.key ?? "", heading]));
  const orderedHeadings: TableColumnHeading[] = [];

  for (const key of keyOrder) {
    const heading = headingsByKey.get(key);
    if (heading) {
      orderedHeadings.push(heading);
    }
  }

  for (const heading of headings) {
    if (!keyOrder.includes(heading.key ?? "")) {
      orderedHeadings.push(heading);
    }
  }

  return orderedHeadings;
}

export function getNetworkRequestsTimeRange(
  rows: NetworkRequestRow[],
): NetworkRequestTimeRange | null {
  let minStart = Infinity;
  let maxEnd = -Infinity;

  for (const row of rows) {
    const start = typeof row.networkRequestTime === "number" ? row.networkRequestTime : NaN;
    const end = typeof row.networkEndTime === "number" ? row.networkEndTime : NaN;

    if (!Number.isNaN(start)) {
      minStart = Math.min(minStart, start);
    }
    if (!Number.isNaN(end)) {
      maxEnd = Math.max(maxEnd, end);
    }
  }

  if (minStart === Infinity || maxEnd === -Infinity || minStart >= maxEnd) {
    return null;
  }

  return { minStart, maxEnd };
}
