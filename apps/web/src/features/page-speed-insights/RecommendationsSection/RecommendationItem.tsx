import ReactMarkdown from "react-markdown";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ActionableStepsTable } from "@/features/page-speed-insights/RecommendationsSection/ActionableStepsTable";
import { ResourcesTable } from "@/features/page-speed-insights/RecommendationsSection/ResourcesTable";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";
import {
  usePageSpeedItems,
  type InsightsContextItem,
} from "@/features/page-speed-insights/PageSpeedContext";
import { RecommendationHeader } from "@/features/page-speed-insights/RecommendationsSection/RecommendationHeader";
import { RecommendationIssuesSection } from "@/features/page-speed-insights/RecommendationsSection/RecommendationIssuesSection";
import { RecommendationNetworkTree } from "@/features/page-speed-insights/RecommendationsSection/RecommendationNetworkTree";
import { RecommendationAuditDetails } from "@/features/page-speed-insights/RecommendationsSection/RecommendationAuditDetails";
import { getRecommendationAuditId } from "@/features/page-speed-insights/RecommendationsSection/recommendationHelpers";
import { recommendationMarkdownComponents } from "@/features/page-speed-insights/RecommendationsSection/recommendationMarkdownComponents";
import { cn } from "@/lib/cn";

interface RecommendationItemProps {
  rec: Recommendation;
  items: InsightsContextItem[];
  /** @deprecated Kept for classic callers; priority styling lives in the header. */
  priorityColors?: Record<string, string>;
  peerMaxSavings?: number;
  /** Row inside a divide-y panel, without its own card chrome. */
  plain?: boolean;
}

const descriptionMarkdownComponents = recommendationMarkdownComponents();

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  );
}

export function RecommendationItem({
  rec,
  items,
  peerMaxSavings = 0,
  plain = false,
}: RecommendationItemProps) {
  const insightsContextItems = usePageSpeedItems();
  const auditId = getRecommendationAuditId(rec.id);
  const auditDataForAllData = items.map(
    (item) => item.item?.lighthouseResult?.audits?.[auditId] ?? null,
  );
  const reportLabels = items.map((item) => item.label);

  return (
    <AccordionItem
      key={rec.id}
      value={rec.id}
      className={cn(
        plain ? "border-0 border-x-0 py-0 last:border-b-0" : "rounded-lg border border-x-0",
      )}
    >
      <AccordionTrigger
        className={cn("hover:no-underline", plain ? "px-4 py-4" : "px-4 py-3")}
      >
        <RecommendationHeader recommendation={rec} peerMaxSavings={peerMaxSavings} />
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4">
          {rec.description ? (
            <div className="text-sm text-muted-foreground">
              <ReactMarkdown components={descriptionMarkdownComponents}>
                {rec.description}
              </ReactMarkdown>
            </div>
          ) : null}
          {rec.actionableSteps.length > 0 ? (
            <div>
              <SectionLabel>Actionable steps</SectionLabel>
              <ActionableStepsTable rec={rec} items={items} />
            </div>
          ) : null}
          <RecommendationIssuesSection recommendation={rec} reportLabels={reportLabels} />
          {rec.items && rec.items.length > 0 ? (
            <div>
              <SectionLabel>Resources to optimize</SectionLabel>
              <ResourcesTable items={rec.items} />
            </div>
          ) : null}
          <RecommendationNetworkTree recommendation={rec} insightsItems={insightsContextItems} />
          <RecommendationAuditDetails auditId={auditId} auditData={auditDataForAllData} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
