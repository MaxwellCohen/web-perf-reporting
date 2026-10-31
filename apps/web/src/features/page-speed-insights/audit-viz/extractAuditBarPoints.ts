import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import type { LabeledValue } from "@/features/page-speed-insights/shared/comparisonChartData";
import { itemLabel, itemNumeric, numericItemValue } from "./auditItemValues";
import type { OpportunityItem, TableItem } from "@/lib/schema";

export type BarFieldConfig = {
  labelKeys: readonly string[];
  valueKeys: readonly string[];
  /** Skip rows where this field matches (e.g. resource-summary Total). */
  skipWhen?: (item: TableItem | OpportunityItem | Record<string, unknown>) => boolean;
  limit?: number;
};

export function extractBarPoints(rows: DetailTableItem[], config: BarFieldConfig): LabeledValue[] {
  const points: LabeledValue[] = [];
  const limit = config.limit ?? 12;

  for (const row of rows) {
    const label = row._userLabel || "Report";
    const items = row.auditResult?.details?.items || [];
    const scored = items
      .filter((item) => !config.skipWhen?.(item))
      .map((item) => ({
        category: itemLabel(item, config.labelKeys),
        value: itemNumeric(item, config.valueKeys) ?? 0,
      }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

    for (const entry of scored) {
      points.push({ label, category: entry.category, value: entry.value });
    }
  }

  return points;
}

export function extractStackedSegmentPoints(
  rows: DetailTableItem[],
  config: {
    labelKeys: readonly string[];
    segments: Array<{ key: string; valueKeys: readonly string[] }>;
    limit?: number;
    /** Derive segment values from totalBytes / wastedBytes. */
    usedUnusedFromBytes?: boolean;
  },
): Array<{ label: string; category: string; segment: string; value: number }> {
  const limit = config.limit ?? 12;
  const points: Array<{ label: string; category: string; segment: string; value: number }> = [];

  for (const row of rows) {
    const reportLabel = row._userLabel || "Report";
    const items = [...(row.auditResult?.details?.items || [])];

    const ranked = items
      .map((item) => {
        if (config.usedUnusedFromBytes) {
          const total = itemNumeric(item, ["totalBytes"]) ?? 0;
          const wasted = itemNumeric(item, ["wastedBytes"]) ?? 0;
          return { item, rank: wasted || total };
        }
        let rank = 0;
        for (const segment of config.segments) {
          rank += itemNumeric(item, segment.valueKeys) ?? 0;
        }
        return { item, rank };
      })
      .filter((entry) => entry.rank > 0)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, limit);

    for (const { item } of ranked) {
      const category = itemLabel(item, config.labelKeys);
      if (config.usedUnusedFromBytes) {
        const total = itemNumeric(item, ["totalBytes"]) ?? 0;
        const wasted = itemNumeric(item, ["wastedBytes"]) ?? 0;
        const used = Math.max(0, total - wasted);
        if (used > 0) points.push({ label: reportLabel, category, segment: "used", value: used });
        if (wasted > 0) {
          points.push({ label: reportLabel, category, segment: "unused", value: wasted });
        }
        continue;
      }

      for (const segment of config.segments) {
        const value = itemNumeric(item, segment.valueKeys) ?? 0;
        if (value > 0) {
          points.push({ label: reportLabel, category, segment: segment.key, value });
        }
      }
    }
  }

  return points;
}

export function extractDomSizeKpis(rows: DetailTableItem[]): Array<{
  reportLabel: string;
  stats: Array<{ label: string; value: number }>;
}> {
  return rows.map((row) => {
    const stats = (row.auditResult?.details?.items || [])
      .map((item) => {
        const label =
          typeof item.statistic === "string" ? item.statistic : itemLabel(item, ["statistic"]);
        const value = numericItemValue(item.value) ?? 0;
        return { label, value };
      })
      .filter((stat) => Number.isFinite(stat.value));
    return { reportLabel: row._userLabel || "Report", stats };
  });
}

export type DebugKpiFormat = "count" | "bytes" | "ms" | "cls" | "throughput";

export function extractDebugKpis(
  items: Array<{ auditResult?: { details?: unknown }; _userLabel: string }>,
  keys: Array<{ key: string; label: string; format: DebugKpiFormat }>,
): Array<{
  reportLabel: string;
  metrics: Array<{ key: string; label: string; value: number; format: DebugKpiFormat }>;
}> {
  return items.map((row) => {
    const details = row.auditResult?.details as
      | { items?: Array<Record<string, unknown>> }
      | undefined;
    const debug = details?.items?.[0] ?? {};
    const metrics = keys
      .map((def) => {
        const value = numericItemValue(debug[def.key]);
        if (value == null || !Number.isFinite(value)) return null;
        return { key: def.key, label: def.label, value, format: def.format };
      })
      .filter((metric): metric is NonNullable<typeof metric> => metric != null);
    return { reportLabel: row._userLabel || "Report", metrics };
  });
}
