import { LoadingMessage } from "@/components/common/LoadingMessage";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Suspense, ViewTransition } from "react";

import { PageSpeedInsightsDashboardContent } from "./PageSpeedInsightsDashboardWrapper";

export default async function PageSpeedPublicIdPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  console.log("in page.tsx on server");
  return (
    <ViewTransition>
      <ErrorMessage>
        <Suspense fallback={<LoadingMessage />}>
          <PageSpeedInsightsDashboardContent publicId={publicId} />
        </Suspense>
      </ErrorMessage>
    </ViewTransition>
  );
}
