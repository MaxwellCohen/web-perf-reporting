import type { PerformanceChartData } from '@/components/common/ChartSettings';
import type { CruxHistoryItem } from '@/lib/schema';

export function cruxHistogramBarData(
  data: CruxHistoryItem,
): PerformanceChartData[] {
  return [
    {
      status: 'good',
      density: data.good_density || 0,
      fill: 'var(--color-good_density)',
    },
    {
      status: 'ni',
      density: data.ni_density || 0,
      fill: 'var(--color-ni_density)',
    },
    {
      status: 'poor',
      density: data.poor_density || 0,
      fill: 'var(--color-poor_density)',
    },
  ];
}
