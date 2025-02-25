"use server"
import { requestPageSpeedData } from '@/lib/services/pageSpeedInsights.service';

import { PageSpeedInsightsDashboard } from './pageSpeedInsightsDashboard';

export async function PageSpeedInsights({
  url,
}: {
  url: string;

}) {
  const data = await Promise.all([requestPageSpeedData(url, 'DESKTOP'), requestPageSpeedData(url, 'MOBILE')]);
  if (!data[0]) {
    return null;
  }
  return (
    <PageSpeedInsightsDashboard data={data[0]} />
  );
}
