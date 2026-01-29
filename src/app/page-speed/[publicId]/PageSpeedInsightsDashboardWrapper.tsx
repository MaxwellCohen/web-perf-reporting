'use client';
import { PageSpeedInsightsDashboard } from '@/components/page-speed/pageSpeedInsightsDashboard';
import { useFetchPageSpeedDataByPublicId } from '@/components/page-speed/useFetchPageSpeedDataByPublicId';
import { LoadingMessage } from '@/components/common/LoadingMessage';
import { useEffect, useState } from 'react';

export function PageSpeedInsightsDashboardWrapper({
  publicId,
}: {
  publicId: string;
}) {
  const { data, isLoading } = useFetchPageSpeedDataByPublicId(publicId);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <LoadingMessage />;
  }

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
