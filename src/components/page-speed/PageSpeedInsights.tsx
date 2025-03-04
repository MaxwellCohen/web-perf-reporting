"use server"
import { requestPageSpeedData } from '@/lib/services/pageSpeedInsights.service';

import { PageSpeedInsightsDashboard } from './pageSpeedInsightsDashboard';

export async function PageSpeedInsights({
  url,
}: {
  url: string;

}) {
  const data = await Promise.all([requestPageSpeedData(url, 'DESKTOP'), requestPageSpeedData(url, 'MOBILE')]);

  return (
    <PageSpeedInsightsDashboard desktopData={data[0]} mobileData={data[1]} />
  );
}
