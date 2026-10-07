"use client";
import dynamic from "next/dynamic";
import { LoadingMessage } from "@/components/common/LoadingMessage";
import { ReportErrorCard } from "@/components/common/ErrorMessage";
import { usePageSpeedInsightsQueryByPublicId } from "@/features/page-speed-insights/data/usePageSpeedInsightsQuery";

// Dashboard pulls recharts + react-markdown + tanstack tables. It only
// renders after the report query resolves, so load it behind the existing
// Suspense boundary instead of in the initial bundle.
const PageSpeedInsightsDashboard = dynamic(
  () =>
    import("@/features/page-speed-insights/pageSpeedInsightsDashboard").then(
      (mod) => mod.PageSpeedInsightsDashboard,
    ),
  { loading: () => <LoadingMessage /> },
);

export function PageSpeedInsightsDashboardContent({ publicId }: { publicId: string }) {
  const result = usePageSpeedInsightsQueryByPublicId(publicId);

  if (result.status === "failed") {
    return <ReportErrorCard testUrl={result.url} description={result.error} />;
  }

  return <PageSpeedInsightsDashboard data={result.data} labels={["Mobile", "Desktop"]} />;
}
