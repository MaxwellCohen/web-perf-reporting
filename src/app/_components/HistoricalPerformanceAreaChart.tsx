'use client';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { HistoricalPerformanceChartData, chartConfig } from './ChartSettings';

export function HistoricalPerformanceAreaChart({
  chartData,
}: {
  chartData: HistoricalPerformanceChartData[];
}) {
  return (
    <ChartContainer config={chartConfig}>
      <AreaChart
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
        <Area
          dataKey="good"
          type="natural"
          fill="var(--color-good)"
          fillOpacity={0.4}
          stroke="var(--color-good)"
          stackId="a"
        />
        <Area
          dataKey="ni"
          type="natural"
          fill="var(--color-ni)"
          fillOpacity={0.4}
          stroke="var(--color-ni)"
          stackId="a"
        />
        <Area
          dataKey="poor"
          type="natural"
          fill="var(--color-poor)"
          fillOpacity={0.4}
          stroke="var(--color-poor)"
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  );
}
