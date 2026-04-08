import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/features/page-speed-insights/RecommendationsSection/utils";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";
import { recommendationMarkdownComponents } from "@/features/page-speed-insights/RecommendationsSection/recommendationMarkdownComponents";

interface RecommendationHeaderProps {
  recommendation: Recommendation;
  priorityColors: Record<string, string>;
}

const titleMarkdownComponents = recommendationMarkdownComponents({ linkStopPropagation: true });

export function RecommendationHeader({
  recommendation,
  priorityColors,
}: RecommendationHeaderProps) {
  return (
    <div className="flex w-full items-start justify-between gap-4 text-left">
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-base font-semibold">
            <ReactMarkdown components={titleMarkdownComponents}>
              {recommendation.title}
            </ReactMarkdown>
          </span>
          <Badge className={priorityColors[recommendation.priority]}>
            {recommendation.priority}
          </Badge>
        </div>
        {recommendation.impact.metric && recommendation.impact.savings ? (
          <div className="text-sm text-muted-foreground">
            Potential savings: {formatTime(recommendation.impact.savings)} on{" "}
            {recommendation.impact.metric}
          </div>
        ) : null}
      </div>
    </div>
  );
}
