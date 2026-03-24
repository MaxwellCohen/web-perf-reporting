'use client';
import { PageSpeedInsightsDashboard } from '@/features/page-speed-insights/pageSpeedInsightsDashboard';
import { usePageSpeedInsightsQueryByPublicId } from '@/features/page-speed-insights/data/usePageSpeedInsightsQuery';

export function PageSpeedInsightsDashboardContent({ publicId }: { publicId: string }) {
  const { data } = usePageSpeedInsightsQueryByPublicId(publicId);
  if (data && !Array.isArray(data)) {
    throw new Error('Failed to load PageSpeed Insights report.');
  }
  return (
    <PageSpeedInsightsDashboard data={data} labels={['Mobile', 'Desktop']} />
  );
}
