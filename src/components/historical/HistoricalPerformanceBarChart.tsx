'use client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { CartesianGrid, XAxis, Bar, BarChart } from 'recharts';
import { HistoricalPerformanceChartData, chartConfig } from '@/components/common/ChartSettings';

export function HistoricalPerformanceBarChart({
  chartData,
}: {
  chartData: HistoricalPerformanceChartData[];
}) {
  return (
    <ChartContainer config={chartConfig}>
      <BarChart
        accessibilityLayer
        data={chartData}
        margin={{
          left: 12,
          right: 12,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
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
