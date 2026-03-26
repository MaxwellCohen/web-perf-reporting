import { IssuesFoundTable } from "@/features/page-speed-insights/RecommendationsSection/IssuesFoundTable";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";
import { shouldShowSeparateTablesPerReport } from "@/features/page-speed-insights/auditTableConfig";
import {
  compareReportLabels,
  getCombinedReportLabel,
} from "@/features/page-speed-insights/shared/reportLabels";
import { getRecommendationAuditId } from "@/features/page-speed-insights/RecommendationsSection/recommendationHelpers";

interface RecommendationIssuesSectionProps {
  recommendation: Recommendation;
  reportLabels: string[];
}

export function RecommendationIssuesSection({
  recommendation,
  reportLabels,
}: RecommendationIssuesSectionProps) {
  if (!recommendation.tableData) return null;
  const { tableData } = recommendation;
  const hasItems = (tableData.items.length ?? 0) > 0 || (tableData.itemsByReport?.size ?? 0) > 0;
  if (!hasItems) return null;

  const auditId = getRecommendationAuditId(recommendation.id);
  const shouldShowSeparateTables = shouldShowSeparateTablesPerReport(auditId);

  return (
    <div className="mb-4 mt-4">
      <h4 className="mb-2 text-sm font-semibold">Issues Found:</h4>
      {shouldShowSeparateTables &&
      recommendation.tableData.itemsByReport &&
      recommendation.tableData.itemsByReport.size > 0 ? (
        Array.from(recommendation.tableData.itemsByReport.entries())
          .sort(([labelA], [labelB]) => compareReportLabels(labelA, labelB))
          .map(([reportLabel, reportItems]) => (
            <div key={reportLabel} className="mb-4">
              <h5 className="mb-2 text-xs font-semibold text-muted-foreground">{reportLabel}</h5>
              <IssuesFoundTable
                headings={recommendation.tableData!.headings}
                items={reportItems}
                device={reportLabel}
              />
            </div>
          ))
      ) : (
        <div className="mb-4">
          <h5 className="mb-2 text-xs font-semibold text-muted-foreground">
            {getCombinedReportLabel(reportLabels)}
          </h5>
          <IssuesFoundTable
            headings={recommendation.tableData.headings}
            items={recommendation.tableData.items}
            device={reportLabels[0] ?? getCombinedReportLabel(reportLabels)}
          />
        </div>
      )}
    </div>
  );
}
