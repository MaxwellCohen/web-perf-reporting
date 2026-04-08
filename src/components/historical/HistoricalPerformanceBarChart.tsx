"use client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CartesianGrid, XAxis, BarChart } from "recharts";
import { HistoricalPerformanceChartData, chartConfig } from "@/components/common/ChartSettings";
import { HistoricalCruxDensityBars } from "@/components/historical/historicalCruxDensityLayers";

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
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
        <HistoricalCruxDensityBars />
      </BarChart>
    </ChartContainer>
  );
}
