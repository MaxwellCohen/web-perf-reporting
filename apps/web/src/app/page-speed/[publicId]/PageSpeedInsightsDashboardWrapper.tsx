"use client";
import { ReportErrorCard } from "@/components/common/ErrorMessage";
import { usePageSpeedInsightsQueryByPublicId } from "@/features/page-speed-insights/data/usePageSpeedInsightsQuery";
import { PageSpeedInsightsDashboard } from "@/features/page-speed-insights/pageSpeedInsightsDashboard";

export function PageSpeedInsightsDashboardContent({ publicId }: { publicId: string }) {
  const result = usePageSpeedInsightsQueryByPublicId(publicId);

  if (result.status === "failed") {
    return <ReportErrorCard testUrl={result.url} description={result.error} />;
  }

  return <PageSpeedInsightsDashboard data={result.data} labels={["Mobile", "Desktop"]} />;
}
