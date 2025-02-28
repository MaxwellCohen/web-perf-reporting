import { ChartConfig } from '@/components/ui/chart';
import { CruxHistoryItem } from '@/lib/schema';

export const chartConfig = {
  P75: {
    label: 'P75',
    color: 'hsl(var(--chart-4))',
  },
  density: {
    label: 'density',
  },
  good_density: {
    label: `Good`,
    color: 'hsl(var(--chart-1))',
  },
  ni_density: {
    label: `Needs Improvement`,
    color: 'hsl(var(--chart-2))',
  },
  poor_density: {
    label: `Poor`,
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

export type PerformanceChartData = {
  status: string;
  density: number;
  fill: string;
};

export type HistoricalPerformanceChartData = CruxHistoryItem;
