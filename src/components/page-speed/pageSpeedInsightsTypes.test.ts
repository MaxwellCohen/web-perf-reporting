import { describe, expect, it } from 'vitest';
import type {
  InsightsContextItem,
  PageSpeedDashboardItem,
} from '@/components/page-speed/pageSpeedInsightsTypes';
import type { PageSpeedInsights } from '@/lib/schema';

describe('pageSpeedInsightsTypes', () => {
  it('PageSpeedDashboardItem has item and label', () => {
    const item: PageSpeedDashboardItem = {
      item: {} as PageSpeedInsights,
      label: 'Mobile',
    };
    expect(item.item).toBeDefined();
    expect(item.label).toBe('Mobile');
  });

  it('InsightsContextItem is compatible with PageSpeedDashboardItem', () => {
    const dashboardItem: PageSpeedDashboardItem = {
      item: {} as PageSpeedInsights,
      label: 'Desktop',
    };
    const contextItem: InsightsContextItem = dashboardItem;
    expect(contextItem).toEqual(dashboardItem);
  });
});
