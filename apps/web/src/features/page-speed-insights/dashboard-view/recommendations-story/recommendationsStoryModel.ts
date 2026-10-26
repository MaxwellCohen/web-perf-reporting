import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";
import { formatBytes, formatMs } from "@/features/page-speed-insights/shared/format";

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

export type RecommendationsLead = {
  magnitude: string;
  sentence: string;
};

export type RecommendationsStoryFacts = {
  counts: PriorityCount[];
  milliseconds: number;
  bytes: number;
  largest: LargestSaving[];
  lead: RecommendationsLead;
};

export type SavingsKind = "ms" | "bytes" | "other";

export function savingsKind(unit: string | undefined): SavingsKind {
  const normalized = unit?.toLowerCase() ?? "";
  if (normalized.includes("ms") || normalized.includes("millisecond")) return "ms";
  if (normalized.includes("byte")) return "bytes";
  return "other";
}

export function formatRecommendationSavings(savings: number, unit: string): string {
  const kind = savingsKind(unit);
  if (kind === "ms") return formatMs(savings);
  if (kind === "bytes") return formatBytes(savings);
  return unit ? `${savings} ${unit}` : String(savings);
}

function savingsCaption(milliseconds: number, bytes: number): string | null {
  const parts = [
    milliseconds > 0 ? formatMs(milliseconds) : null,
    bytes > 0 ? formatBytes(bytes) : null,
  ].filter((part): part is string => part != null);
  if (parts.length === 0) return null;
  if (parts.length === 1) return `Potential savings of ${parts[0]}.`;
  return `Potential savings of ${parts[0]} and ${parts[1]}.`;
}

function buildLead({
  total,
  counts,
  milliseconds,
  bytes,
}: {
  total: number;
  counts: PriorityCount[];
  milliseconds: number;
  bytes: number;
}): RecommendationsLead {
  const high = counts.find((item) => item.priority === "high")?.count ?? 0;
  const magnitude =
    milliseconds > 0
      ? formatMs(milliseconds)
      : bytes > 0
        ? formatBytes(bytes)
        : String(total);

  const focus =
    high > 0
      ? `${high} high-priority finding${high === 1 ? "" : "s"}`
      : `${total} finding${total === 1 ? "" : "s"}`;
  const savings = savingsCaption(milliseconds, bytes);
  const sentence = savings ? `${focus}. ${savings}` : `${focus} to review.`;

  return { magnitude, sentence };
}

/** Peak savings among peers that share the same unit family (ms or bytes). */
export function peerMaxSavingsFor(
  recommendation: Recommendation,
  peers: Recommendation[],
): number {
  const kind = savingsKind(recommendation.impact?.unit);
  if (kind === "other") return 0;
  return peers.reduce((max, peer) => {
    if (savingsKind(peer.impact?.unit) !== kind) return max;
    return Math.max(max, peer.impact?.savings ?? 0);
  }, 0);
}

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
    const kind = savingsKind(recommendation.impact.unit);
    if (kind === "ms") milliseconds += savings;
    else if (kind === "bytes") bytes += savings;
  }

  const counts = PRIORITY_ORDER.filter((priority) => totals[priority] > 0).map((priority) => ({
    priority,
    count: totals[priority],
  }));

  const largest = recommendations
    .filter((recommendation) => (recommendation.impact.savings ?? 0) > 0)
    .sort((left, right) => (right.impact.savings ?? 0) - (left.impact.savings ?? 0))
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
    counts,
    milliseconds,
    bytes,
    largest,
    lead: buildLead({
      total: recommendations.length,
      counts,
      milliseconds,
      bytes,
    }),
  };
}
