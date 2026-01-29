'use client';
import { PageSpeedInsightsDashboard } from '@/components/page-speed/pageSpeedInsightsDashboard';
import { useFetchPageSpeedDataByPublicId } from '@/components/page-speed/useFetchPageSpeedDataByPublicId';
import { LoadingMessage } from '@/components/common/LoadingMessage';

export function PageSpeedInsightsDashboardWrapper({
  publicId,
}: {
  publicId: string;
}) {
  const { data, isLoading } = useFetchPageSpeedDataByPublicId(publicId);

  if (isLoading || !data?.filter(Boolean).length) {
    return <LoadingMessage />;
  }

  return (
    <PageSpeedInsightsDashboard
      data={data}
      labels={['Mobile', 'Desktop']}
    />
  );
}
