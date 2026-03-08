import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { formatTime } from '@/components/page-speed/RecommendationsSection/utils';
import type { Recommendation } from '@/components/page-speed/RecommendationsSection/types';

interface RecommendationHeaderProps {
  recommendation: Recommendation;
  priorityColors: Record<string, string>;
}

const titleMarkdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  a: ({
    href,
    children,
  }: {
    href?: string;
    children?: React.ReactNode;
  }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline dark:text-blue-400"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  ),
};

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
            Potential savings: {formatTime(recommendation.impact.savings)} on{' '}
            {recommendation.impact.metric}
          </div>
        ) : null}
      </div>
    </div>
  );
}
