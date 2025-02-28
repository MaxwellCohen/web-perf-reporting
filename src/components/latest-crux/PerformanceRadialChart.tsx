'use client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { RadialBarChart, RadialBar } from 'recharts';
import { chartConfig } from '@/components/common/ChartSettings';
import { CruxHistoryItem } from '@/lib/schema';

export function RadialChart({
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
          dataKey="poor_density"
          type="natural"
          fill="var(--color-poor_density)"
          fillOpacity={0.4}
          stroke="var(--color-poor_density)"
          stackId="a"
        />

        <RadialBar
          dataKey="ni_density"
          type="natural"
          fill="var(--color-ni_density)"
          fillOpacity={0.4}
          stroke="var(--color-ni_density)"
          stackId="a"
        />
        <RadialBar
          dataKey="good_density"
          type="natural"
          fill="var(--color-good_density)"
          fillOpacity={0.4}
          stroke="var(--color-good_density)"
          stackId="a"
        />
      </RadialBarChart>
    </ChartContainer>
  );
}
