import { describe, expect, it, vi } from 'vitest';
import type { InsightsContextItem } from '@/lib/page-speed-insights/types';
import {
  selectJavaScriptMetrics,
  type JSStats,
} from './javascriptMetricsSelectors';

vi.mock('./extractJSMetrics', () => ({
  extractJSMetrics: (item: { label: string }) => {
    if (item.label === 'Mobile') {
      return {
        label: 'Mobile',
        jsResources: [
          { transferSize: 100, resourceSize: 200 },
          { transferSize: 50, resourceSize: 100 },
        ],
        bootupTime: [],
        mainThreadWork: [],
        unusedJS: [],
        unminifiedJS: [],
        legacyJS: [],
        diagnostics: [],
        mainThreadTasks: [],
      };
    }
    return {
      label: 'Desktop',
      jsResources: [],
      bootupTime: [],
      mainThreadWork: [],
      unusedJS: [],
      unminifiedJS: [],
      legacyJS: [],
      diagnostics: [],
      mainThreadTasks: [],
    };
  },
}));

describe('selectJavaScriptMetrics', () => {
  it('returns empty jsMetrics and jsStats when items is empty', () => {
    const result = selectJavaScriptMetrics({ context: { items: [] } });

    expect(result.jsMetrics).toEqual([]);
    expect(result.jsStats).toEqual([]);
  });

  it('computes jsStats from jsResources (totalScripts, totalTransferSize, totalResourceSize)', () => {
    const result = selectJavaScriptMetrics({
      context: {
        items: [
          { label: 'Mobile', item: {} } as InsightsContextItem,
          { label: 'Desktop', item: {} } as InsightsContextItem,
        ],
      },
    });

    expect(result.jsMetrics).toHaveLength(2);

    const mobileStats = result.jsStats.find((s) => s.label === 'Mobile') as JSStats;
    expect(mobileStats.totalScripts).toBe(2);
    expect(mobileStats.totalTransferSize).toBe(150);
    expect(mobileStats.totalResourceSize).toBe(300);

    const desktopStats = result.jsStats.find((s) => s.label === 'Desktop') as JSStats;
    expect(desktopStats.totalScripts).toBe(0);
    expect(desktopStats.totalTransferSize).toBe(0);
    expect(desktopStats.totalResourceSize).toBe(0);
  });
});
