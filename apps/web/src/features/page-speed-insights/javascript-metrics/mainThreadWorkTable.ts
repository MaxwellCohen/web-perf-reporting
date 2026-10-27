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

/** Browser main-thread pipeline order (parse → script → style → paint → GC → other). */
const MAIN_THREAD_CATEGORY_ORDER = [
  "parseHTML",
  "scriptParseCompile",
  "scriptEvaluation",
  "styleLayout",
  "paintCompositeRender",
  "garbageCollection",
  "other",
] as const;

function categoryName(item: TableItem): string {
  const group = typeof item.group === "string" ? item.group : "";
  const groupLabel = typeof item.groupLabel === "string" ? item.groupLabel : "";
  return groupLabel || toTitleCase(group) || "Other";
}

function categoryGroup(item: TableItem): string {
  return typeof item.group === "string" ? item.group : "";
}

function categoryOrderIndex(group: string): number {
  const index = (MAIN_THREAD_CATEGORY_ORDER as readonly string[]).indexOf(group);
  return index === -1 ? MAIN_THREAD_CATEGORY_ORDER.length : index;
}

function orderedReportLabels(labels: string[]): string[] {
  return [...new Set(labels.filter(Boolean))].sort(compareReportLabels);
}

export function buildMainThreadWorkTable(metrics: MainThreadWorkMetric[]): MainThreadWorkTableModel {
  const validMetrics = metrics.filter((metric) => metric.mainThreadWork.length > 0);
  const reportLabels = orderedReportLabels(validMetrics.map((metric) => metric.label));
  const rowsByCategory = new Map<string, MainThreadWorkTableRow>();
  const groupByCategory = new Map<string, string>();

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
      if (!groupByCategory.has(category)) {
        groupByCategory.set(category, categoryGroup(item));
      }
    }
  }

  const rows = [...rowsByCategory.values()].sort((a, b) => {
    const orderDiff =
      categoryOrderIndex(groupByCategory.get(a.category) ?? "") -
      categoryOrderIndex(groupByCategory.get(b.category) ?? "");
    if (orderDiff !== 0) return orderDiff;
    return a.category.localeCompare(b.category);
  });

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
