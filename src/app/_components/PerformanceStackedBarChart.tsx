"use client"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { CruxHistoryItem } from "@/lib/schema"
import { CartesianGrid, Bar,BarChart } from "recharts"
import { chartConfig } from "./ChartSettings"

export function PerformanceStackedBarChart({ histogramData }: { histogramData: CruxHistoryItem }) {
    const chartData = [{
      good: histogramData.good_density ?? 0,
      ni: histogramData.ni_density ?? 0,
      poor: histogramData.poor_density ?? 0,
    }]
    
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
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar
            dataKey="good"
            type="natural"
            fill="var(--color-good)"
            fillOpacity={0.4}
            stroke="var(--color-good)"
            stackId="a"
          />
          <Bar
            dataKey="ni"
            type="natural"
            fill="var(--color-ni)"
            fillOpacity={0.4}
            stroke="var(--color-ni)"
            stackId="a"
          />
          <Bar
            dataKey="poor"
            type="natural"
            fill="var(--color-poor)"
            fillOpacity={0.4}
            stroke="var(--color-poor)"
            stackId="a"
          />
        </BarChart>
      </ChartContainer>
    )
  }
  