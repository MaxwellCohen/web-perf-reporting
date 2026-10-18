import { LoadingMessage } from "@/components/common/LoadingMessage";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Suspense, ViewTransition } from "react";
import { toSearchString } from "@/features/page-speed-insights/dashboard-view/dashboardSearch";
import { PageSpeedInsightsDashboardContent } from "./PageSpeedInsightsDashboardWrapper";

export default async function PageSpeedPublicIdPage({
  params,
  searchParams = Promise.resolve({}),
}: {
  params: Promise<{ publicId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { publicId } = await params;
  const initialSearch = toSearchString(await searchParams);

  return (
    <ViewTransition>
      <ErrorMessage>
        <Suspense fallback={<LoadingMessage />}>
          <PageSpeedInsightsDashboardContent publicId={publicId} initialSearch={initialSearch} />
        </Suspense>
      </ErrorMessage>
    </ViewTransition>
  );
}
