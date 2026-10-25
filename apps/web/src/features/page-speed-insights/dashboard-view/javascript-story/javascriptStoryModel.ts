import type { JSMetrics } from "@/features/page-speed-insights/javascript-metrics/extractJSMetrics";
import type { JSStats } from "@/features/page-speed-insights/javascript-metrics/javascriptMetricsSelectors";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import type { TableItem } from "@/lib/schema";

export const JAVASCRIPT_FACTS = [
  {
    id: "transfer",
    label: "Script transfer",
    description: "JavaScript downloaded over the network, after compression.",
    unit: "bytes",
  },
  {
    id: "mainThread",
    label: "Main thread",
    description: "Time the main thread spent on scripting, style, layout, and paint.",
    unit: "ms",
  },
  {
    id: "longTasks",
    label: "Long-task time",
    description: "Time spent in main-thread tasks during the lab run.",
    unit: "ms",
  },
  {
    id: "unused",
    label: "Unused bytes",
    description: "JavaScript that was downloaded but not used during this page load.",
    unit: "bytes",
  },
] as const;

export type JavaScriptFactId = (typeof JAVASCRIPT_FACTS)[number]["id"];
export type JavaScriptFactUnit = (typeof JAVASCRIPT_FACTS)[number]["unit"];

export type JavaScriptFact = {
  id: JavaScriptFactId;
  label: string;
  description: string;
  unit: JavaScriptFactUnit;
};

export type JavaScriptCategory = {
  id: string;
  label: string;
  durationMs: number;
};

export type JavaScriptReport = {
  label: string;
  values: Partial<Record<JavaScriptFactId, number>>;
  categories: JavaScriptCategory[];
};

export type JavaScriptStory = {
  key: string;
  defaultFactId: JavaScriptFactId;
  facts: JavaScriptFact[];
  reports: JavaScriptReport[];
};

export type JavaScriptStoryInput = {
  jsMetrics?: JSMetrics[] | null;
  jsStats?: JSStats[] | null;
};

const MIN_CATEGORY_MS = 1;

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function categoryLabel(item: TableItem): string {
  const group = typeof item.group === "string" ? item.group : "";
  const groupLabel = typeof item.groupLabel === "string" ? item.groupLabel : "";
  return groupLabel || toTitleCase(group) || "Other";
}

function categoryId(item: TableItem, label: string): string {
  return typeof item.group === "string" && item.group ? item.group : label;
}

function sumField(items: TableItem[], key: string): number | undefined {
  let saw = false;
  let sum = 0;
  for (const item of items) {
    const value = finiteNumber(item[key]);
    if (value == null) continue;
    saw = true;
    sum += value;
  }
  return saw ? sum : undefined;
}

function transferBytes(stats: JSStats | undefined): number | undefined {
  if (!stats) return undefined;
  if (stats.totalScripts > 0 || stats.totalTransferSize > 0) return stats.totalTransferSize;
  return undefined;
}

/** Prefer diagnostics.totalTaskTime, matching TaskSummaryCard. Otherwise sum task durations. */
function longTaskMs(metric: JSMetrics): number | undefined {
  const totalTaskTime = finiteNumber(metric.diagnostics[0]?.totalTaskTime);
  if (totalTaskTime != null) return totalTaskTime;
  return sumField(metric.mainThreadTasks, "duration");
}

/**
 * Unused bytes are wastedBytes, or unusedBytes when wastedBytes is absent.
 * Rows that only have totalBytes or a URL do not count.
 */
function unusedBytes(items: TableItem[]): number | undefined {
  let saw = false;
  let sum = 0;
  for (const item of items) {
    const wasted = finiteNumber(item.wastedBytes);
    const unused = finiteNumber(item.unusedBytes);
    const value = wasted ?? unused;
    if (value == null) continue;
    saw = true;
    sum += value;
  }
  return saw ? sum : undefined;
}

function mainThreadCategories(items: TableItem[]): JavaScriptCategory[] {
  const totals = new Map<string, JavaScriptCategory>();
  for (const item of items) {
    const durationMs = finiteNumber(item.duration);
    if (durationMs == null) continue;
    const label = categoryLabel(item);
    const id = categoryId(item, label);
    const existing = totals.get(id);
    if (existing) {
      existing.durationMs += durationMs;
      continue;
    }
    totals.set(id, { id, label, durationMs });
  }

  return [...totals.values()]
    .filter((category) => category.durationMs >= MIN_CATEGORY_MS)
    .sort((a, b) => b.durationMs - a.durationMs || a.label.localeCompare(b.label));
}

function toReport(metric: JSMetrics, stats: JSStats | undefined): JavaScriptReport {
  const values: JavaScriptReport["values"] = {};
  const transfer = transferBytes(stats);
  const mainThread = sumField(metric.mainThreadWork, "duration");
  const longTasks = longTaskMs(metric);
  const unused = unusedBytes(metric.unusedJS);
  if (transfer != null) values.transfer = transfer;
  if (mainThread != null) values.mainThread = mainThread;
  if (longTasks != null) values.longTasks = longTasks;
  if (unused != null) values.unused = unused;

  return {
    label: metric.label,
    values,
    categories: mainThreadCategories(metric.mainThreadWork),
  };
}

function storyKey(reports: JavaScriptReport[], facts: JavaScriptFact[]): string {
  return reports
    .map((report) => {
      const values = facts
        .map((fact) => {
          const value = report.values[fact.id];
          return value == null ? `${fact.id}:` : `${fact.id}:${Math.round(value)}`;
        })
        .join(",");
      return `${report.label}:${values}`;
    })
    .join("|");
}

export function javascriptStoryFromMetrics(
  input: JavaScriptStoryInput | null,
): JavaScriptStory | null {
  const jsMetrics = input?.jsMetrics ?? [];
  const jsStats = input?.jsStats ?? [];
  if (!jsMetrics.length) return null;

  const reports = jsMetrics
    .map((metric, index) => toReport(metric, jsStats[index]))
    .filter((report) => JAVASCRIPT_FACTS.some((fact) => report.values[fact.id] != null));
  const facts = JAVASCRIPT_FACTS.filter((fact) =>
    reports.some((report) => report.values[fact.id] != null),
  );
  if (!facts.length) return null;

  return {
    key: storyKey(reports, facts),
    defaultFactId: facts[0].id,
    facts: [...facts],
    reports,
  };
}
