import type { PageSpeedInsights } from '@/lib/schema';

export type PageSpeedDashboardItem = {
  item: PageSpeedInsights;
  label: string;
};

export type InsightsContextItem = PageSpeedDashboardItem;
