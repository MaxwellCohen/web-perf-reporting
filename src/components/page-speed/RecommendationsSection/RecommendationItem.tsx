import ReactMarkdown from 'react-markdown';
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { ActionableStepsTable } from '@/components/page-speed/RecommendationsSection/ActionableStepsTable';
import { ResourcesTable } from '@/components/page-speed/RecommendationsSection/ResourcesTable';
import type { Recommendation } from '@/components/page-speed/RecommendationsSection/types';
import { useContext, useMemo } from 'react';
import { InsightsContext, InsightsContextItem } from '@/components/page-speed/PageSpeedContext';
import { RecommendationHeader } from '@/components/page-speed/RecommendationsSection/RecommendationHeader';
import { RecommendationIssuesSection } from '@/components/page-speed/RecommendationsSection/RecommendationIssuesSection';
import { RecommendationNetworkTree } from '@/components/page-speed/RecommendationsSection/RecommendationNetworkTree';
import { RecommendationAuditDetails } from '@/components/page-speed/RecommendationsSection/RecommendationAuditDetails';
import { getRecommendationAuditId } from '@/components/page-speed/RecommendationsSection/recommendationHelpers';

interface RecommendationItemProps {
  rec: Recommendation;
  items: InsightsContextItem[];
  priorityColors: Record<string, string>;
}

export function RecommendationItem({ rec, items, priorityColors }: RecommendationItemProps) {
  const insightsContextItems = useContext(InsightsContext);
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

