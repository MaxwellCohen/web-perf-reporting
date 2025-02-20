"use client"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { RadialBarChart, RadialBar } from 'recharts';
import { chartConfig } from './ChartSettings';
import { CruxHistogram } from '@/lib/schema';

export function RadialChart({ histogramData }: { histogramData: CruxHistogram }) {

    const chartData = [{
      good: histogramData[0].density ?? 0,
      ni: histogramData[1].density ?? 0,
      poor: histogramData[2].density ?? 0,
    }]
    return (
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square w-full max-w-[250px]"
      >
        <RadialBarChart
          data={chartData}
          endAngle={180}
          innerRadius={80}
          outerRadius={130}
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
    )
  }
  