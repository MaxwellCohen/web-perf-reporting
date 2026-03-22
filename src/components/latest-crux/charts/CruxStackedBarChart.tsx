'use client';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { chartConfig } from '@/components/common/ChartSettings';
import type { CruxHistoryItem } from '@/lib/schema';
import { Bar, BarChart, CartesianGrid } from 'recharts';

const margin = {
  left: 12,
  right: 12,
};

export function PerformanceStackedBarChart({
  histogramData,
}: {
  histogramData: CruxHistoryItem;
}) {
  const chartData = [
    {
      good_density: histogramData.good_density ?? 0,
      ni_density: histogramData.ni_density ?? 0,
      poor_density: histogramData.poor_density ?? 0,
    },
  ];

  return (
    <ChartContainer config={chartConfig}>
      <BarChart accessibilityLayer data={chartData} margin={margin}>
        <CartesianGrid vertical={false} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent indicator="dot" labelFormatter={() => null} />
          }
        />
        <Bar
          dataKey="good_density"
          type="natural"
          fill="var(--color-good_density)"
          fillOpacity={0.4}
          stroke="var(--color-good_density)"
          stackId="a"
        />
        <Bar
          dataKey="ni_density"
          type="natural"
          fill="var(--color-ni_density)"
          fillOpacity={0.4}
          stroke="var(--color-ni_density)"
          stackId="a"
        />
        <Bar
          dataKey="poor_density"
          type="natural"
          fill="var(--color-poor_density)"
          fillOpacity={0.4}
          stroke="var(--color-poor_density)"
          stackId="a"
        />
      </BarChart>
    </ChartContainer>
  );
}
