import ReactMarkdown from 'react-markdown';
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { ActionableStepsTable } from '@/features/page-speed-insights/RecommendationsSection/ActionableStepsTable';
import { ResourcesTable } from '@/features/page-speed-insights/RecommendationsSection/ResourcesTable';
import type { Recommendation } from '@/features/page-speed-insights/RecommendationsSection/types';
import { useMemo } from 'react';
import {
  usePageSpeedItems,
  type InsightsContextItem,
} from '@/features/page-speed-insights/PageSpeedContext';
import { RecommendationHeader } from '@/features/page-speed-insights/RecommendationsSection/RecommendationHeader';
import { RecommendationIssuesSection } from '@/features/page-speed-insights/RecommendationsSection/RecommendationIssuesSection';
import { RecommendationNetworkTree } from '@/features/page-speed-insights/RecommendationsSection/RecommendationNetworkTree';
import { RecommendationAuditDetails } from '@/features/page-speed-insights/RecommendationsSection/RecommendationAuditDetails';
import { getRecommendationAuditId } from '@/features/page-speed-insights/RecommendationsSection/recommendationHelpers';

interface RecommendationItemProps {
  rec: Recommendation;
  items: InsightsContextItem[];
  priorityColors: Record<string, string>;
}

export function RecommendationItem({ rec, items, priorityColors }: RecommendationItemProps) {
  const insightsContextItems = usePageSpeedItems();
  const auditId = getRecommendationAuditId(rec.id);
  const auditDataForAllData = useMemo(
    () => items.map((item) => item.item?.lighthouseResult?.audits?.[auditId] ?? null),
    [items, auditId],
  );
  const reportLabels = items.map((item) => item.label);

  return (
    <AccordionItem key={rec.id} value={rec.id} className="rounded-lg border">
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <RecommendationHeader
          recommendation={rec}
          priorityColors={priorityColors}
        />
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        {rec.description && (
          <div className="mb-4 text-sm">
            <ReactMarkdown>{rec.description}</ReactMarkdown>
          </div>
        )}
        <div className="mb-4">
          <h4 className="font-semibold text-sm mb-2">
            Actionable Steps:
          </h4>
          <ActionableStepsTable rec={rec} items={items} />
        </div>
        <RecommendationIssuesSection recommendation={rec} reportLabels={reportLabels} />
        {rec.items && rec.items.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold text-sm mb-2">
              Resources to Optimize:
            </h4>
            <ResourcesTable items={rec.items} />
          </div>
        )}
        <RecommendationNetworkTree
          recommendation={rec}
          insightsItems={insightsContextItems}
        />
        <RecommendationAuditDetails
          auditId={auditId}
          auditData={auditDataForAllData}
        />
      </AccordionContent>
    </AccordionItem>
  );
}

