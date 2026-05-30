"use client";
import { LoadingMessage } from "@/components/common/LoadingMessage";
import { ReportErrorCard } from "@/components/common/ErrorMessage";
import { PageSpeedInsightsDashboard } from "@/features/page-speed-insights/pageSpeedInsightsDashboard";
import { usePageSpeedInsightsQueryByPublicId } from "@/features/page-speed-insights/data/usePageSpeedInsightsQuery";

export function PageSpeedInsightsDashboardContent({ publicId }: { publicId: string }) {
  const query = usePageSpeedInsightsQueryByPublicId(publicId);

  if (query.isLoading) {
    return <LoadingMessage />;
  }

  if (query.result.status === "failed") {
    return <ReportErrorCard testUrl={query.result.url} description={query.result.error} />;
  }

  return <PageSpeedInsightsDashboard data={query.result.data} labels={["Mobile", "Desktop"]} />;
}
