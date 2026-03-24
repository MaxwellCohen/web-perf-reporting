import { LoadingMessage } from '@/components/common/LoadingMessage';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Suspense, ViewTransition } from 'react';
import { ClientOnly } from '@/components/common/ClientOnly';
import { PageSpeedInsightsDashboardContent } from './PageSpeedInsightsDashboardWrapper';

export default async function PageSpeedPublicIdPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  return (
    <ViewTransition>
      <ErrorMessage>
        <Suspense fallback={<LoadingMessage />}>
          <ClientOnly>
            <PageSpeedInsightsDashboardContent publicId={publicId} />
          </ClientOnly>
        </Suspense>
      </ErrorMessage>
    </ViewTransition>
  );
}
