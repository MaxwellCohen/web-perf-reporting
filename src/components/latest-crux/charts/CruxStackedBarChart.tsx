"use client";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { chartConfig } from "@/components/common/ChartSettings";
import {
  CRUX_DENSITY_KEYS_BAR,
  cruxDensityBarProps,
  cruxHistogramDensityRow,
} from "@/components/latest-crux/charts/cruxHistogramDensities";
import type { CruxHistoryItem } from "@/lib/schema";
import { Bar, BarChart, CartesianGrid } from "recharts";

const margin = {
  left: 12,
  right: 12,
};

export function PerformanceStackedBarChart({ histogramData }: { histogramData: CruxHistoryItem }) {
  const chartData = [cruxHistogramDensityRow(histogramData)];

  return (
    <ChartContainer config={chartConfig}>
      <BarChart accessibilityLayer data={chartData} margin={margin}>
        <CartesianGrid vertical={false} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" labelFormatter={() => null} />}
        />
        {CRUX_DENSITY_KEYS_BAR.map((key) => (
          <Bar key={key} {...cruxDensityBarProps(key)} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
