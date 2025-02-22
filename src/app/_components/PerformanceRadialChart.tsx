'use client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { RadialBarChart, RadialBar } from 'recharts';
import { chartConfig } from './ChartSettings';
import { CruxHistoryItem } from '@/lib/schema';

export function RadialChart({
  histogramData,
}: {
  histogramData: CruxHistoryItem;
}) {
  const chartData = [
    {
      good: histogramData.good_density ?? 0,
      ni: histogramData.ni_density ?? 0,
      poor: histogramData.poor_density ?? 0,
    },
  ];

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full"
    >
      <RadialBarChart
        data={chartData}
        innerRadius={"50%"}
        outerRadius={"100%"}
      >
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <RadialBar
          dataKey="poor"
          type="natural"
          fill="var(--color-poor)"
          fillOpacity={0.4}
          stroke="var(--color-poor)"
          stackId="a"
        />

        <RadialBar
          dataKey="ni"
          type="natural"
          fill="var(--color-ni)"
          fillOpacity={0.4}
          stroke="var(--color-ni)"
          stackId="a"
        />
        <RadialBar
          dataKey="good"
          type="natural"
          fill="var(--color-good)"
          fillOpacity={0.4}
          stroke="var(--color-good)"
          stackId="a"
        />
      </RadialBarChart>
    </ChartContainer>
  );
}
