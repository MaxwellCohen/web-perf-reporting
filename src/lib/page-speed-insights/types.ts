import type { PageSpeedInsights } from '@/lib/schema';

export type PageSpeedDashboardItem = {
  item: PageSpeedInsights;
  label: string;
};

/** Alias used by the dashboard store for labeled PSI report slices. */
export type InsightsContextItem = PageSpeedDashboardItem;
