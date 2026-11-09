"use client";
import { useReducer, useState, useSyncExternalStore, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { LoadingMessage } from "@/components/common/LoadingMessage";
import { ReportErrorCard } from "@/components/common/ErrorMessage";
import { usePageSpeedInsightsQueryByPublicId } from "@/features/page-speed-insights/data/usePageSpeedInsightsQuery";
import {
  resetPageSpeedInsightsByPublicId,
  type PageSpeedLoadResult,
} from "@/lib/page-speed-insights/pageSpeedInsightsClient";
import { requestPageSpeedData } from "@/lib/services/pageSpeedInsights.service";

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

const subscribeNoop = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

function FailedReport({
  result,
  onRetry,
}: {
  result: Extract<PageSpeedLoadResult, { status: "failed" }>;
  onRetry: () => void;
}) {
  const router = useRouter();
  const [isStarting, startTransition] = useTransition();
  const [runAgainError, setRunAgainError] = useState<string>();
  const canRetry = result.reason === "timeout" || result.reason === "error";
  const runAgainUrl = result.reason === "job" ? result.url : undefined;

  const runAgain = () => {
    if (!runAgainUrl) return;
    setRunAgainError(undefined);
    startTransition(async () => {
      try {
        const publicId = await requestPageSpeedData(runAgainUrl);
        if (publicId) router.push(`/page-speed/${publicId}`);
        else setRunAgainError("We couldn't start a new run. Please try again.");
      } catch {
        setRunAgainError("We couldn't start a new run. Please try again.");
      }
    });
  };

  return (
    <ReportErrorCard
      testUrl={result.url}
      description={runAgainError ?? result.error}
      onRetry={canRetry ? onRetry : undefined}
      onRunAgain={runAgainUrl ? runAgain : undefined}
      runAgainPending={isStarting}
    />
  );
}

export function PageSpeedInsightsDashboardContent({
  publicId,
  initialSearch = "",
}: {
  publicId: string;
  initialSearch?: string;
}) {
  // Bumping re-renders after the cached load is dropped, so the hook re-polls.
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const result = usePageSpeedInsightsQueryByPublicId(publicId);
  const origin = useSyncExternalStore(subscribeNoop, getOrigin, getServerOrigin);

  if (result.status === "failed") {
    return (
      <FailedReport
        result={result}
        onRetry={() => {
          resetPageSpeedInsightsByPublicId(publicId);
          rerender();
        }}
      />
    );
  }

  return (
    <PageSpeedInsightsDashboard
      data={result.data}
      labels={["Mobile", "Desktop"]}
      shareUrl={origin ? `${origin}/page-speed/${encodeURIComponent(publicId)}` : undefined}
      initialSearch={initialSearch}
    />
  );
}
