import { useMemo } from 'react';
import {
  type InsightsContextItem,
  usePageSpeedItems,
} from '@/components/page-speed/PageSpeedContext';
import type { JSMetrics } from '@/components/page-speed/javascript-metrics/extractJSMetrics';
import { extractJSMetrics } from '@/components/page-speed/javascript-metrics/extractJSMetrics';

export type JSStats = {
  label: string;
  totalScripts: number;
  totalTransferSize: number;
  totalResourceSize: number;
};

type SnapshotWithItems = {
  context: { items: InsightsContextItem[] };
};

function computeJsStats(jsMetrics: JSMetrics[]): JSStats[] {
  return jsMetrics.map(({ jsResources, label }) => {
    if (!jsResources.length) {
      return {
        label,
        totalScripts: 0,
        totalTransferSize: 0,
        totalResourceSize: 0,
      };
    }

    const totalScripts = jsResources.length;
    const { totalTransferSize, totalResourceSize } = jsResources.reduce(
      (acc: { totalTransferSize: number; totalResourceSize: number }, curr) => {
        const transferSize = +(curr?.transferSize ?? 0) || 0;
        const resourceSize = +(curr?.resourceSize ?? 0) || 0;
        return {
          totalTransferSize: acc.totalTransferSize + transferSize,
          totalResourceSize: acc.totalResourceSize + resourceSize,
        };
      },
      { totalTransferSize: 0, totalResourceSize: 0 },
    );

    return {
      label,
      totalScripts,
      totalTransferSize,
      totalResourceSize,
    };
  });
}

export function selectJavaScriptMetrics(snapshot: SnapshotWithItems) {
  const items = snapshot.context.items;
  const jsMetrics = items.map(extractJSMetrics);
  const jsStats = computeJsStats(jsMetrics);
  return { jsMetrics, jsStats };
}

export function useJavaScriptMetrics() {
  const items = usePageSpeedItems();
  return useMemo(
    () => selectJavaScriptMetrics({ context: { items } }),
    [items],
  );
}
