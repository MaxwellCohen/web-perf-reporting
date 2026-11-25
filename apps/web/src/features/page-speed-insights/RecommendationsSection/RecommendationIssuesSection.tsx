import { ReportColumn, ReportColumns } from "@/features/page-speed-insights/shared/ReportColumns";
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
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Issues found
      </p>
      {shouldShowSeparateTables &&
      recommendation.tableData.itemsByReport &&
      recommendation.tableData.itemsByReport.size > 0 ? (
        <ReportColumns>
          {Array.from(recommendation.tableData.itemsByReport.entries())
            .sort(([labelA], [labelB]) => compareReportLabels(labelA, labelB))
            .map(([reportLabel, reportItems]) => (
              <ReportColumn key={reportLabel} label={reportLabel}>
                <IssuesFoundTable
                  headings={recommendation.tableData!.headings}
                  items={reportItems}
                  device={reportLabel}
                />
              </ReportColumn>
            ))}
        </ReportColumns>
      ) : (
        <ReportColumn label={getCombinedReportLabel(reportLabels)}>
          <IssuesFoundTable
            headings={recommendation.tableData.headings}
            items={recommendation.tableData.items}
            device={reportLabels[0] ?? getCombinedReportLabel(reportLabels)}
          />
        </ReportColumn>
      )}
    </div>
  );
}
