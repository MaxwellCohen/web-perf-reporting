'use client';
import { PageSpeedInsightsDashboard } from '@/components/page-speed/pageSpeedInsightsDashboard';
import { useFetchPageSpeedDataByPublicId } from '@/components/page-speed/useFetchPageSpeedDataByPublicId';
import { LoadingMessage } from '@/components/common/LoadingMessage';
import { ErrorMessage } from '@/components/common/ErrorMessage';
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


  if (data && !Array.isArray(data)) {
    return <ErrorMessage 
      title="Failed to Load Report" 
      description="We couldn't load the PageSpeed Insights data. This might be due to a temporary issue or the report might not be available."
      retryUrl={`/page-speed/`}
    />;
  }

  if (!isClient || isLoading || !data?.filter(Boolean).length) {
    return <LoadingMessage />;
  } 

  return (
    <PageSpeedInsightsDashboard
      data={data}
      labels={['Mobile', 'Desktop']}
    />
  );
}