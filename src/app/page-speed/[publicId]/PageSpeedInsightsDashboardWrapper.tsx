"use client";
import { LoadingMessage } from "@/components/common/LoadingMessage";
import { ReportErrorCard } from "@/components/common/ErrorMessage";
import { PageSpeedInsightsDashboard } from "@/features/page-speed-insights/pageSpeedInsightsDashboard";
import { usePageSpeedInsightsQueryByPublicId } from "@/features/page-speed-insights/data/usePageSpeedInsightsQuery";

export function PageSpeedInsightsDashboardContent({ publicId }: { publicId: string }) {
  const { data, isLoading } = usePageSpeedInsightsQueryByPublicId(publicId);
  if (isLoading) return <LoadingMessage />;
  if (data && !Array.isArray(data)) {
    if (data.status === "failed") {
      return <ReportErrorCard testUrl={data.url} description={data.error} />;
    }
    throw new Error("Failed to load PageSpeed Insights report.");
  }
  return <PageSpeedInsightsDashboard data={data} labels={["Mobile", "Desktop"]} />;
}
