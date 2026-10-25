import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";

const PRIORITY_ORDER = ["high", "medium", "low"] as const;

export type PriorityCount = {
  priority: Recommendation["priority"];
  count: number;
};

export type LargestSaving = {
  id: string;
  title: string;
  priority: Recommendation["priority"];
  savings: number;
  unit: string;
  metric?: string;
};

export type RecommendationsStoryFacts = {
  counts: PriorityCount[];
  milliseconds: number;
  bytes: number;
  largest: LargestSaving[];
};

export function recommendationsStoryFrom(
  recommendations: Recommendation[],
): RecommendationsStoryFacts | null {
  if (recommendations.length === 0) return null;

  const totals = { high: 0, medium: 0, low: 0 };
  let milliseconds = 0;
  let bytes = 0;

  for (const recommendation of recommendations) {
    totals[recommendation.priority] += 1;
    const savings = recommendation.impact.savings ?? 0;
    const unit = recommendation.impact.unit?.toLowerCase() ?? "";
    if (unit.includes("ms") || unit.includes("millisecond")) {
      milliseconds += savings;
    } else if (unit.includes("byte")) {
      bytes += savings;
    }
  }

  const largest = recommendations
    .filter((recommendation) => (recommendation.impact.savings ?? 0) > 0)
    .sort(
      (left, right) => (right.impact.savings ?? 0) - (left.impact.savings ?? 0),
    )
    .slice(0, 3)
    .map((recommendation) => ({
      id: recommendation.id,
      title: recommendation.title,
      priority: recommendation.priority,
      savings: recommendation.impact.savings ?? 0,
      unit: recommendation.impact.unit ?? "",
      ...(recommendation.impact.metric ? { metric: recommendation.impact.metric } : {}),
    }));

  return {
    counts: PRIORITY_ORDER.filter((priority) => totals[priority] > 0).map((priority) => ({
      priority,
      count: totals[priority],
    })),
    milliseconds,
    bytes,
    largest,
  };
}
