import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import type { TableItem } from "@/lib/schema";
import { getNumber, getUrlString } from "@/lib/utils";

const TYPE_ORDER = [
  "Document",
  "Script",
  "Stylesheet",
  "Font",
  "Image",
  "Media",
  "XHR",
  "Fetch",
  "Other",
];
/** resource-summary rows that are rollups, not resource types. */
const SUMMARY_ROLLUPS = new Set(["total", "third-party"]);

export type PageWeightType = {
  resourceType: string;
  requestCount: number;
  transferSize: number;
};

export type PageWeightUrl = {
  /** URL without query or hash, so cache-busting params still match across runs. */
  key: string;
  url: string;
  resourceType: string;
  transferSize: number;
  requestCount: number;
};

export type PageWeightReport = {
  label: string;
  totalBytes: number;
  requestCount: number;
  thirdPartyBytes: number | null;
  types: PageWeightType[];
  urls: PageWeightUrl[];
};

export type WeightDeltaStatus = "added" | "removed" | "grew" | "shrank" | "same";

export type TypeComparisonRow = {
  resourceType: string;
  a: PageWeightType | null;
  b: PageWeightType | null;
  delta: number;
};

export type UrlComparisonRow = {
  key: string;
  url: string;
  resourceType: string;
  a: number | null;
  b: number | null;
  delta: number;
  status: WeightDeltaStatus;
};

export type PageWeightComparison = {
  a: PageWeightReport;
  b: PageWeightReport;
  totalDelta: number;
  requestDelta: number;
  types: TypeComparisonRow[];
  urls: UrlComparisonRow[];
};

function finite(value: unknown): number {
  const number = getNumber(value);
  return typeof number === "number" && Number.isFinite(number) && number > 0 ? number : 0;
}

export function canonicalResourceType(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "Other";
  const lower = text.toLowerCase();
  return TYPE_ORDER.find((type) => type.toLowerCase() === lower) ?? text;
}

function typeRank(resourceType: string): number {
  const index = TYPE_ORDER.indexOf(resourceType);
  return index === -1 ? TYPE_ORDER.length : index;
}

export function urlKey(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split(/[?#]/)[0] ?? url;
  }
}

function tableItems(entry: InsightsContextItem, auditId: string): TableItem[] {
  const details = entry.item.lighthouseResult?.audits?.[auditId]?.details;
  if (!details || !("items" in details) || !Array.isArray(details.items)) return [];
  return details.items as TableItem[];
}

function urlsFrom(entry: InsightsContextItem): PageWeightUrl[] {
  const byKey = new Map<string, PageWeightUrl>();
  for (const item of tableItems(entry, "network-requests")) {
    const url = getUrlString(item.url);
    const transferSize = finite(item.transferSize);
    if (!url || transferSize <= 0) continue;
    const key = urlKey(url);
    const existing = byKey.get(key);
    if (existing) {
      existing.transferSize += transferSize;
      existing.requestCount += 1;
      continue;
    }
    byKey.set(key, {
      key,
      url,
      resourceType: canonicalResourceType(item.resourceType),
      transferSize,
      requestCount: 1,
    });
  }
  return [...byKey.values()].sort((left, right) => right.transferSize - left.transferSize);
}

function typesFromUrls(urls: PageWeightUrl[]): PageWeightType[] {
  const byType = new Map<string, PageWeightType>();
  for (const url of urls) {
    const current = byType.get(url.resourceType) ?? {
      resourceType: url.resourceType,
      requestCount: 0,
      transferSize: 0,
    };
    current.requestCount += url.requestCount;
    current.transferSize += url.transferSize;
    byType.set(url.resourceType, current);
  }
  return [...byType.values()];
}

function sortTypes(types: PageWeightType[]): PageWeightType[] {
  return [...types].sort(
    (left, right) =>
      right.transferSize - left.transferSize ||
      typeRank(left.resourceType) - typeRank(right.resourceType),
  );
}

export function pageWeightReportFromEntry(entry: InsightsContextItem): PageWeightReport | null {
  const urls = urlsFrom(entry);
  const summary = tableItems(entry, "resource-summary");
  const rowFor = (type: string) =>
    summary.find((row) => String(row.resourceType ?? "").toLowerCase() === type);

  const summaryTypes = summary.flatMap((row) => {
    const raw = String(row.resourceType ?? "").toLowerCase();
    if (!raw || SUMMARY_ROLLUPS.has(raw)) return [];
    const requestCount = finite(row.requestCount);
    const transferSize = finite(row.transferSize);
    if (requestCount === 0 && transferSize === 0) return [];
    return [{ resourceType: canonicalResourceType(raw), requestCount, transferSize }];
  });

  const types = sortTypes(summaryTypes.length ? summaryTypes : typesFromUrls(urls));
  if (!types.length) return null;

  const total = rowFor("total");
  const thirdParty = rowFor("third-party");
  const totalBytes =
    finite(total?.transferSize) || types.reduce((sum, type) => sum + type.transferSize, 0);
  const requestCount =
    finite(total?.requestCount) || types.reduce((sum, type) => sum + type.requestCount, 0);

  return {
    label: entry.label,
    totalBytes,
    requestCount,
    thirdPartyBytes: thirdParty ? finite(thirdParty.transferSize) : null,
    types,
    urls,
  };
}

export function pageWeightReportsFromItems(items: InsightsContextItem[]): PageWeightReport[] {
  return items.flatMap((entry) => {
    const report = pageWeightReportFromEntry(entry);
    return report ? [report] : [];
  });
}

function statusFor(a: number | null, b: number | null): WeightDeltaStatus {
  if (a == null) return "added";
  if (b == null) return "removed";
  if (b > a) return "grew";
  if (b < a) return "shrank";
  return "same";
}

export function comparePageWeight(a: PageWeightReport, b: PageWeightReport): PageWeightComparison {
  const typeNames = [...new Set([...a.types, ...b.types].map((type) => type.resourceType))];
  const types = typeNames
    .map((resourceType) => {
      const left = a.types.find((type) => type.resourceType === resourceType) ?? null;
      const right = b.types.find((type) => type.resourceType === resourceType) ?? null;
      return {
        resourceType,
        a: left,
        b: right,
        delta: (right?.transferSize ?? 0) - (left?.transferSize ?? 0),
      };
    })
    .sort(
      (left, right) =>
        Math.max(right.a?.transferSize ?? 0, right.b?.transferSize ?? 0) -
          Math.max(left.a?.transferSize ?? 0, left.b?.transferSize ?? 0) ||
        typeRank(left.resourceType) - typeRank(right.resourceType),
    );

  const urlsByKey = new Map<string, UrlComparisonRow>();
  for (const url of a.urls) {
    urlsByKey.set(url.key, {
      key: url.key,
      url: url.url,
      resourceType: url.resourceType,
      a: url.transferSize,
      b: null,
      delta: 0,
      status: "removed",
    });
  }
  for (const url of b.urls) {
    const existing = urlsByKey.get(url.key);
    if (existing) existing.b = url.transferSize;
    else {
      urlsByKey.set(url.key, {
        key: url.key,
        url: url.url,
        resourceType: url.resourceType,
        a: null,
        b: url.transferSize,
        delta: 0,
        status: "added",
      });
    }
  }
  const urls = [...urlsByKey.values()]
    .map((row) => ({
      ...row,
      delta: (row.b ?? 0) - (row.a ?? 0),
      status: statusFor(row.a, row.b),
    }))
    .sort(
      (left, right) =>
        Math.abs(right.delta) - Math.abs(left.delta) ||
        Math.max(right.a ?? 0, right.b ?? 0) - Math.max(left.a ?? 0, left.b ?? 0) ||
        left.url.localeCompare(right.url),
    );

  return {
    a,
    b,
    totalDelta: b.totalBytes - a.totalBytes,
    requestDelta: b.requestCount - a.requestCount,
    types,
    urls,
  };
}

export function formatByteDelta(bytes: number, format: (value: number) => string): string {
  if (bytes === 0) return "±0";
  return `${bytes > 0 ? "+" : "−"}${format(Math.abs(bytes))}`;
}

export function percentDelta(from: number, to: number): string | null {
  if (from <= 0) return null;
  const percent = ((to - from) / from) * 100;
  if (Math.abs(percent) < 0.5) return "±0%";
  return `${percent > 0 ? "+" : "−"}${Math.abs(percent).toFixed(Math.abs(percent) < 10 ? 1 : 0)}%`;
}
