"use server"
import { formFactor } from '@/lib/services';
import { requestPageSpeedData } from '@/lib/services/pageSpeedInsights.service';

import { PageSpeedInsightsDashboard } from './pageSpeedInsightsDashboard';

export async function PageSpeedInsights({
  url,
  formFactor,
}: {
  url: string;
  formFactor: formFactor;
}) {
  const data = await requestPageSpeedData(url, formFactor);
  if (!data) {
    return null;
  }
  return (
    <PageSpeedInsightsDashboard data={data} />
  );
}
