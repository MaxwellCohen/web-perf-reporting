"use client";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { chartConfig } from "@/components/common/ChartSettings";
import {
  CRUX_DENSITY_KEYS_RADIAL,
  cruxDensityBarProps,
  cruxHistogramDensityRow,
} from "@/components/latest-crux/charts/cruxHistogramDensities";
import type { CruxHistoryItem } from "@/lib/schema";
import { RadialBar, RadialBarChart } from "recharts";

export function CruxRadialChart({ histogramData }: { histogramData: CruxHistoryItem }) {
  const chartData = [cruxHistogramDensityRow(histogramData)];

  return (
    <ChartContainer config={chartConfig} className="w-full">
      <RadialBarChart data={chartData} innerRadius={"50%"} outerRadius={"100%"}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        {CRUX_DENSITY_KEYS_RADIAL.map((key) => (
          <RadialBar key={key} {...cruxDensityBarProps(key)} />
        ))}
      </RadialBarChart>
    </ChartContainer>
  );
}
