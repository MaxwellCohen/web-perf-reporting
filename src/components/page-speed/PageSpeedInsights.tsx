'use client';
// import { requestPageSpeedData } from '@/lib/services/pageSpeedInsights.service';
import dynamic from 'next/dynamic';

const PageSpeedInsightsDashboard = dynamic(
  () =>
    import('./pageSpeedInsightsDashboard').then(
      (mod) => mod.PageSpeedInsightsDashboard,
    ),
  { ssr: false },
);

export function PageSpeedInsights() {
  return <PageSpeedInsightsDashboard />;
}
