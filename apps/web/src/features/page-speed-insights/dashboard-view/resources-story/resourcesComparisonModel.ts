import type { ResourceStageId } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import type {
  InvestigationMetrics,
  ResourcesInvestigation,
} from "@/features/page-speed-insights/dashboard-view/resources-story/resourcesInvestigationModel";
import { formatBytes, formatMs } from "@/features/page-speed-insights/shared/format";

export type ComparisonUnit = "bytes" | "ms" | "count";

export type ResourcesMetricRow = {
  id: keyof InvestigationMetrics | "requestCount";
  label: string;
  /** Stage this row deep-links to. */
  stage: ResourceStageId;
  unit: ComparisonUnit;
  a: number | null;
  b: number | null;
  /** b − a; null when either side is missing. */
  delta: number | null;
};

export type SuspectTag = "new" | "dropped" | null;

export type ResourcesComparison = {
  a: ResourcesInvestigation;
  b: ResourcesInvestigation;
  metrics: ResourcesMetricRow[];
  /** Tag for a suspect URL in report A (dropped = no longer a suspect in B). */
  tagInA: (url: string) => SuspectTag;
  /** Tag for a suspect URL in report B (new = not a suspect in A). */
  tagInB: (url: string) => SuspectTag;
};

const METRIC_ROWS: Array<Omit<ResourcesMetricRow, "a" | "b" | "delta">> = [
  { id: "transferBytes", label: "Transferred", stage: "arrived", unit: "bytes" },
  { id: "requestCount", label: "Requests", stage: "arrived", unit: "count" },
  { id: "thirdPartyBytes", label: "Third-party", stage: "arrived", unit: "bytes" },
  { id: "scriptBytes", label: "Scripts", stage: "scripts", unit: "bytes" },
  { id: "unusedBytes", label: "Unused JavaScript", stage: "unused", unit: "bytes" },
  { id: "mainThreadMs", label: "Main thread", stage: "main-thread", unit: "ms" },
  { id: "longTaskMs", label: "Long tasks", stage: "main-thread", unit: "ms" },
];

function metricValue(
  report: ResourcesInvestigation,
  id: ResourcesMetricRow["id"],
): number | null {
  return id === "requestCount" ? report.requestCount : report.metrics[id];
}

export function compareResourcesInvestigations(
  a: ResourcesInvestigation,
  b: ResourcesInvestigation,
): ResourcesComparison {
  const metrics = METRIC_ROWS.flatMap((row) => {
    const left = metricValue(a, row.id);
    const right = metricValue(b, row.id);
    if (left == null && right == null) return [];
    return [{ ...row, a: left, b: right, delta: left != null && right != null ? right - left : null }];
  });
  const urlsA = new Set(a.suspects.map((suspect) => suspect.url));
  const urlsB = new Set(b.suspects.map((suspect) => suspect.url));

  return {
    a,
    b,
    metrics,
    tagInA: (url) => (urlsB.has(url) ? null : "dropped"),
    tagInB: (url) => (urlsA.has(url) ? null : "new"),
  };
}

export function formatMetric(value: number | null, unit: ComparisonUnit): string {
  if (value == null) return "—";
  if (unit === "bytes") return formatBytes(value);
  if (unit === "ms") return formatMs(value);
  return value.toLocaleString();
}

export function formatMetricDelta(delta: number | null, unit: ComparisonUnit): string {
  if (delta == null) return "—";
  if (delta === 0) return "±0";
  return `${delta > 0 ? "+" : "−"}${formatMetric(Math.abs(delta), unit)}`;
}
