import ReactMarkdown from "react-markdown";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";
import { recommendationMarkdownComponents } from "@/features/page-speed-insights/RecommendationsSection/recommendationMarkdownComponents";
import { formatRecommendationSavings } from "@/features/page-speed-insights/dashboard-view/recommendations-story/recommendationsStoryModel";

interface RecommendationHeaderProps {
  recommendation: Recommendation;
  /** Largest savings among sibling recommendations sharing the same unit family. */
  peerMaxSavings?: number;
}

const PRIORITY_LABEL: Record<Recommendation["priority"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const titleMarkdownComponents = recommendationMarkdownComponents({ linkStopPropagation: true });

function savingsLabel(recommendation: Recommendation): string | null {
  const savings = recommendation.impact.savings ?? 0;
  if (!(savings > 0)) return null;
  const formatted = formatRecommendationSavings(savings, recommendation.impact.unit ?? "");
  if (recommendation.impact.metric) {
    return `Est. savings: ${formatted} ${recommendation.impact.metric}`;
  }
  return `Est. savings: ${formatted}`;
}

export function RecommendationHeader({
  recommendation,
  peerMaxSavings = 0,
}: RecommendationHeaderProps) {
  const label = savingsLabel(recommendation);
  const savings = recommendation.impact.savings ?? 0;
  const barPct =
    label && peerMaxSavings > 0 ? Math.min(100, (savings / peerMaxSavings) * 100) : null;

  return (
    <div className="w-full space-y-2 text-left">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {PRIORITY_LABEL[recommendation.priority]} priority
          </span>
          <span className="block min-w-0 text-base font-semibold leading-snug">
            <ReactMarkdown components={titleMarkdownComponents}>
              {recommendation.title}
            </ReactMarkdown>
          </span>
        </div>
        {label ? (
          <span className="shrink-0 font-mono text-xs font-medium tabular-nums">{label}</span>
        ) : null}
      </div>
      {barPct != null ? (
        <div className="h-1.5 overflow-hidden rounded-sm bg-muted" aria-hidden>
          <div className="h-full bg-foreground/80" style={{ width: `${barPct}%` }} />
        </div>
      ) : null}
    </div>
  );
}
