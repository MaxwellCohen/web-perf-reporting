"use client";
import { LoadingMessage } from "@/components/common/LoadingMessage";
import { ReportErrorCard } from "@/components/common/ErrorMessage";
import { usePageSpeedInsightsQueryByPublicId } from "@/features/page-speed-insights/data/usePageSpeedInsightsQuery";
import dynamic from "next/dynamic";

const PageSpeedInsightsDashboard = dynamic(() =>
  import("@/features/page-speed-insights/pageSpeedInsightsDashboard").then(
    (mod) => mod.PageSpeedInsightsDashboard,
  ),
);

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
