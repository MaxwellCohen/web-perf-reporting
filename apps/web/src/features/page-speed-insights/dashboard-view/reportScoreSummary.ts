import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import {
  METRIC_AUDIT_IDS,
  METRIC_AUDIT_TO_ACRONYM,
  type CwvMetricAcronym,
  type MetricAuditId,
} from "@/features/page-speed-insights/metricCauseAudits";

export type ScoreTone = "good" | "average" | "poor" | "unknown";

export type CategoryScore = {
  id: string;
  title: string;
  score: number | null;
};

export type MetricScore = {
  id: MetricAuditId;
  acronym: CwvMetricAcronym;
  title: string;
  displayValue: string | null;
  score: number | null;
  /** Performance category auditRef weight (already a % of the Performance score). */
  weight: number | null;
};

export type ReportScoreSummary = {
  label: string;
  performance: CategoryScore | null;
  otherCategories: CategoryScore[];
  metrics: MetricScore[];
};

const SECONDARY_CATEGORY_IDS = ["accessibility", "best-practices", "seo"] as const;

const SCORE_TONE_COLORS: Record<ScoreTone, string> = {
  good: "hsl(var(--chart-1))",
  average: "hsl(var(--chart-2))",
  poor: "hsl(var(--chart-3))",
  unknown: "hsl(var(--muted-foreground))",
};

function toScore(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function scoreTone(score: number | null | undefined): ScoreTone {
  if (typeof score !== "number") return "unknown";
  if (score >= 0.9) return "good";
  if (score >= 0.5) return "average";
  return "poor";
}

export function scoreToneColor(score: number | null | undefined): string {
  return SCORE_TONE_COLORS[scoreTone(score)];
}

export function formatScore(score: number | null): string {
  return score === null ? "–" : String(Math.round(score * 100));
}

function performanceWeightByAuditId(
  auditRefs: Array<{ id?: string; weight?: number }> | undefined,
): Map<string, number> {
  const weights = new Map<string, number>();
  if (!auditRefs) return weights;
  for (const ref of auditRefs) {
    if (typeof ref.id === "string" && typeof ref.weight === "number" && Number.isFinite(ref.weight)) {
      weights.set(ref.id, ref.weight);
    }
  }
  return weights;
}

export function summarizeReport({ item, label }: InsightsContextItem): ReportScoreSummary {
  const categories = item.lighthouseResult?.categories ?? {};
  const audits = item.lighthouseResult?.audits ?? {};
  const weights = performanceWeightByAuditId(categories.performance?.auditRefs);

  const toCategoryScore = (id: string): CategoryScore | null => {
    const category = categories[id];
    if (!category) return null;
    return { id, title: category.title ?? id, score: toScore(category.score) };
  };

  return {
    label,
    performance: toCategoryScore("performance"),
    otherCategories: SECONDARY_CATEGORY_IDS.flatMap((id) => {
      const category = toCategoryScore(id);
      return category ? [category] : [];
    }),
    metrics: METRIC_AUDIT_IDS.flatMap((id) => {
      const audit = audits[id];
      if (!audit) return [];
      return [
        {
          id,
          acronym: METRIC_AUDIT_TO_ACRONYM[id],
          title: audit.title ?? id,
          displayValue: audit.displayValue ?? null,
          score: toScore(audit.score),
          weight: weights.get(id) ?? null,
        },
      ];
    }),
  };
}
