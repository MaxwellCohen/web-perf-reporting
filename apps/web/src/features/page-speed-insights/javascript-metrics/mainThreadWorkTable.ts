import type { TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import { compareReportLabels } from "@/features/page-speed-insights/shared/reportLabels";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";

export type MainThreadWorkMetric = {
  label: string;
  mainThreadWork: TableItem[];
};

export type MainThreadWorkTableRow = {
  category: string;
  valuesByReportLabel: Record<string, number | undefined>;
};

export type MainThreadWorkTableModel = {
  rows: MainThreadWorkTableRow[];
  reportLabels: string[];
};

function categoryName(item: TableItem): string {
  const group = typeof item.group === "string" ? item.group : "";
  const groupLabel = typeof item.groupLabel === "string" ? item.groupLabel : "";
  return groupLabel || toTitleCase(group) || "Other";
}

function orderedReportLabels(labels: string[]): string[] {
  return [...new Set(labels.filter(Boolean))].sort(compareReportLabels);
}

export function buildMainThreadWorkTable(metrics: MainThreadWorkMetric[]): MainThreadWorkTableModel {
  const validMetrics = metrics.filter((metric) => metric.mainThreadWork.length > 0);
  const reportLabels = orderedReportLabels(validMetrics.map((metric) => metric.label));
  const rowsByCategory = new Map<string, MainThreadWorkTableRow>();
  const maxByCategory = new Map<string, number>();

  for (const { label, mainThreadWork } of validMetrics) {
    for (const item of mainThreadWork) {
      const category = categoryName(item);
      const row = rowsByCategory.get(category) ?? {
        category,
        valuesByReportLabel: {},
      };
      const duration = getNumber(item.duration);
      row.valuesByReportLabel[label] = duration;
      rowsByCategory.set(category, row);
      maxByCategory.set(category, Math.max(maxByCategory.get(category) ?? 0, duration ?? 0));
    }
  }

  const rows = [...rowsByCategory.values()];
  if (reportLabels.length > 1) {
    rows.sort(
      (a, b) => (maxByCategory.get(b.category) ?? 0) - (maxByCategory.get(a.category) ?? 0),
    );
  }

  return { rows, reportLabels };
}

export function mainThreadWorkDurationHeader(label: string): string {
  return `${label} Time Spent`;
}

export function buildMainThreadWorkTableFromDetailRows(
  rows: Array<{
    _userLabel: string;
    auditResult?: {
      details?: {
        items?: TableItem[];
      };
    };
  }>,
): MainThreadWorkTableModel | null {
  const model = buildMainThreadWorkTable(
    rows.map((row) => ({
      label: row._userLabel,
      mainThreadWork: row.auditResult?.details?.items ?? [],
    })),
  );

  return model.rows.length ? model : null;
}
