import { AuditDetailOpportunity, TableColumnHeading, TableItem } from "@/lib/schema";
import type { AuditEntry } from "@/features/page-speed-insights/RecommendationsSection/auditTypes";
import type {
  Recommendation,
  ActionableStep,
} from "@/features/page-speed-insights/RecommendationsSection/types";
import { extractSpecificRecommendations } from "@/features/page-speed-insights/RecommendationsSection/extractRecommendations";
import { deduplicateResourcesByUrl } from "@/features/page-speed-insights/RecommendationsSection/deduplicateResources";

const METRIC_NAMES: Record<string, string> = {
  LCP: "Largest Contentful Paint",
  FCP: "First Contentful Paint",
  TBT: "Total Blocking Time",
  CLS: "Cumulative Layout Shift",
  INP: "Interaction to Next Paint",
  SI: "Speed Index",
};

function getRecommendationPriority(
  score: number | null | undefined,
  savings?: number,
): "high" | "medium" | "low" {
  if (score === 0 || score === null || score === undefined) return "high";
  if (score < 0.5) return "high";
  if (score < 0.75) return "medium";
  if (savings && savings > 1000) return "high";
  if (savings && savings > 500) return "medium";
  return "low";
}

type ActionableStepAccumulator = {
  reports: Set<string>;
  url?: string;
  host?: string;
};

function mergeActionableStepIntoMap(
  map: Map<string, ActionableStepAccumulator>,
  step: string,
  reports: string[],
  url?: string,
  host?: string,
): void {
  if (!map.has(step)) {
    map.set(step, { reports: new Set(), url, host });
  }
  const entry = map.get(step)!;
  reports.forEach((r) => entry.reports.add(r));
  if (url && !entry.url) {
    entry.url = url;
  }
  if (host && !entry.host) {
    entry.host = host;
  }
}

function collectSpecificRecommendations(
  auditId: string,
  auditEntries: AuditEntry[],
): ActionableStep[] {
  const stepsMap = new Map<string, { reports: Set<string>; url?: string; host?: string }>();

  auditEntries.forEach(({ audit, label }) => {
    const details = audit.details;
    const reportItems: Array<Record<string, unknown>> = [];
    if (details && (details as { type?: string }).type === "opportunity") {
      const opportunityDetails = details as AuditDetailOpportunity;
      if (opportunityDetails.items) {
        reportItems.push(...(opportunityDetails.items as Array<Record<string, unknown>>));
      }
    }

    const specificRecs = extractSpecificRecommendations(
      auditId,
      reportItems,
      { explanation: audit.explanation, displayValue: audit.displayValue },
      label,
    );

    specificRecs.forEach(({ step, reports, url, host }) => {
      mergeActionableStepIntoMap(stepsMap, step, reports, url, host);
    });
  });

  return Array.from(stepsMap.entries()).map(([step, { reports, url, host }]) => ({
    step,
    reports: Array.from(reports),
    url,
    host,
  }));
}

export function processMetricSavingsAudit(
  auditId: string,
  audit: AuditEntry["audit"],
  auditEntries: AuditEntry[],
  metric: string,
  savings: number,
  worstScore: number | null,
  allItems: Array<Record<string, unknown>>,
  category = "Performance",
): Recommendation {
  const metricName = METRIC_NAMES[metric] || metric;
  const priority = getRecommendationPriority(worstScore, savings);

  const specificRecs = collectSpecificRecommendations(auditId, auditEntries);
  const actionableSteps =
    specificRecs.length > 0
      ? specificRecs
      : getDefaultActionableSteps(
          audit,
          audit.explanation,
          auditEntries.map((e) => e.label),
        );

  // Deduplicate resources by URL and keep all
  const deduplicatedItems = deduplicateResourcesByUrl(allItems);

  return {
    id: `${auditId}-${metric}`,
    title: audit.title || auditId,
    description: audit.description || "",
    priority,
    category,
    impact: {
      metric: metricName,
      savings: savings,
      unit: ["TBT", "LCP", "FCP", "INP"].includes(metric) ? "ms" : undefined,
    },
    items: deduplicatedItems,
    actionableSteps,
  };
}

function addFallbackSteps(
  audit: AuditEntry["audit"],
  explanation: string | undefined,
  stepsMap: Map<string, Set<string>>,
  allReportsLabel: string[],
): void {
  if (explanation) {
    explanation
      .split(". ")
      .filter((s: string) => s.length > 20)
      .forEach((step) => {
        stepsMap.set(step, new Set(allReportsLabel));
      });
  }
  if (stepsMap.size === 0 && audit.description) {
    const descLines = audit.description.split(/[.!?]\s+/);
    descLines
      .filter((line: string) => line.length > 30 && line.length < 200)
      .forEach((step) => {
        stepsMap.set(step, new Set(allReportsLabel));
      });
  }
}

function buildActionableStepsFromMap(stepsMap: Map<string, Set<string>>): ActionableStep[] {
  return Array.from(stepsMap.entries()).map(([step, reports]) => ({
    step,
    reports: Array.from(reports),
  }));
}

function getDefaultActionableSteps(
  audit: AuditEntry["audit"],
  explanation: string | undefined,
  allReportsLabel: string[],
): ActionableStep[] {
  if (explanation) {
    return [{ step: explanation, reports: allReportsLabel }];
  }
  if (audit.description) {
    return [{ step: audit.description.split(".")[0] + ".", reports: allReportsLabel }];
  }
  return [
    {
      step: "Review the audit details for specific recommendations",
      reports: allReportsLabel,
    },
  ];
}

function collectFailedAuditSteps(
  auditId: string,
  auditEntries: AuditEntry[],
  stepsMap: Map<string, Set<string>>,
): string[] {
  const allReportLabels = auditEntries.map((e) => e.label);
  const allReportsLabel =
    allReportLabels.length === auditEntries.length &&
    allReportLabels.every((label) => auditEntries.some((e) => e.label === label))
      ? allReportLabels
      : [];

  const specificRecs = collectSpecificRecommendations(auditId, auditEntries);
  specificRecs.forEach(({ step, reports }) => {
    if (!stepsMap.has(step)) {
      stepsMap.set(step, new Set());
    }
    reports.forEach((r) => stepsMap.get(step)!.add(r));
  });

  return allReportsLabel;
}

export function processFailedAudit(
  auditId: string,
  audit: AuditEntry["audit"],
  auditEntries: AuditEntry[],
  worstScore: number | null,
  allTableDataItems: TableItem[],
  tableHeadings: TableColumnHeading[] | undefined,
  explanation: string | undefined,
  itemsByReport?: Map<string, TableItem[]>,
  category = "Performance",
): Recommendation | null {
  const priority = getRecommendationPriority(worstScore);
  const tableData =
    allTableDataItems.length > 0 && tableHeadings
      ? {
          headings: tableHeadings,
          items: allTableDataItems,
          itemsByReport: itemsByReport || new Map<string, TableItem[]>(),
        }
      : undefined;

  const stepsMap = new Map<string, Set<string>>();
  const allReportsLabel = collectFailedAuditSteps(auditId, auditEntries, stepsMap);
  addFallbackSteps(audit, explanation, stepsMap, allReportsLabel);
  const actionableSteps = buildActionableStepsFromMap(stepsMap);

  if (actionableSteps.length > 0 || audit.description || tableData) {
    return {
      id: `${auditId}-failed`,
      title: audit.title || auditId,
      description: audit.description || "",
      priority,
      category,
      impact: {},
      actionableSteps:
        actionableSteps.length > 0
          ? actionableSteps
          : getDefaultActionableSteps(audit, explanation, allReportsLabel),
      tableData,
    };
  }

  return null;
}
