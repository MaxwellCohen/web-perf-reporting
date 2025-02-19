"use client"

import { RadialBar, RadialBarChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis } from "recharts"

import { CruxHistogram, CruxHistoryHistogramTimeseries, CruxPercentile } from "../../lib/schema"
import { useMemo, useState } from "react"
import { ChartSelector } from "./ChartSelector"

const getDensity = (data: CruxHistogram | CruxHistoryHistogramTimeseries, index: number) => {
  if (data instanceof Array) {
    const value = data[index];
    if ('density' in value) {
      return value.density;
    }
    if ('densities' in value) {
      return value.densities?.at(-1) ?? 0;
    }
  }
  return 0;
}

type ChartData = {
  status: string;
  density: number;
  fill: string;
};


const chartConfig = {
  density: {
    label: 'density',
  },
  good: {
    label: `Good`,
    color: "hsl(var(--chart-2))",
  },
  ni: {
    label: `Needs Improvement`,
    color: "hsl(var(--chart-3))",
  },
  poor: {
    label: `Poor`,
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

const makeHistogramData = (data?: CruxHistogram) => {
  if (!data) {
    return {
      chartData: [] as ChartData[],
      chartConfig: {} satisfies ChartConfig,
      extraInfo: [] as string[],
    }
  }

  const chartData: ChartData[] = [
    { status: "good", density: getDensity(data, 0), fill: "var(--color-good)" },
    { status: "ni", density: getDensity(data, 1), fill: "var(--color-ni)" },
    { status: "poor", density: getDensity(data, 2), fill: "var(--color-poor)" },
  ];

  return {
    chartData,
  }
}

const ChartMap: Record<string, typeof Histogram> = {
  'Histogram': Histogram,
  'Stacked Bar': MyBarChart,
  'Radial Chart': RadialChart,
}

export function CurrentPerformanceChart({ title, dateRage, histogramData, percentiles }: { title: string, dateRage: string, histogramData: CruxHistogram, percentiles?: CruxPercentile }) {
  const [ChartType, setChartType] = useState('Histogram')

  const extraInfo = useMemo(() => [
    `Good: ${histogramData[0]?.start ?? 0} ${histogramData[0]?.end ? `to ${histogramData[0]?.end}` : ""}`,
    `Needs Improvement: ${histogramData[1]?.start ?? 0} ${histogramData[1]?.end ? `to ${histogramData[1]?.end}` : ""}`,
    `Poor: ${histogramData[2]?.start ?? 0} ${histogramData[2]?.end ? `to ${histogramData[2]?.end}` : ""}`,
  ], [histogramData]);

  const Chart = ChartMap[ChartType] ?? Histogram;

  if (!histogramData.length) {
    return null;
  }
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{dateRage}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartSelector onValueChange={(value) => setChartType(value)} options={Object.keys(ChartMap)} />
          <Chart histogramData={histogramData} />
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            P75 is {percentiles && 'p75' in percentiles ? percentiles.p75 : 'N/A'}
          </div>
          {extraInfo.map((info, idx) => <div className="leading-none text-muted-foreground" key={`${idx}-${info}`}>
            {info}
          </div>)}
        </CardFooter>
      </Card>
    </div>
  )
}

function Histogram({ histogramData }: { histogramData: CruxHistogram }) {
  const { chartData } = useMemo(() => makeHistogramData(histogramData), [histogramData]);
  return (
    <div>
      <ChartContainer config={chartConfig}>
        <BarChart accessibilityLayer data={chartData}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="status"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) =>
              // @ts-ignore
              chartConfig[value as keyof typeof chartConfig]?.label || ''
            }
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Bar
            dataKey="density"
            strokeWidth={2}
            radius={8}
            activeIndex={2}
            activeBar={({ ...props }) => {
              return (
                <Rectangle
                  {...props}
                  fillOpacity={0.8}
                  stroke={props.payload.fill}
                  strokeDasharray={4}
                  strokeDashoffset={4}
                />
              )
            }}
          />
        </BarChart>
      </ChartContainer>
    </div>
  )
}


function MyBarChart({ histogramData }: { histogramData: CruxHistogram }) {

  const chartData = [{
    good: histogramData[0].density ?? 0,
    ni: histogramData[1].density ?? 0,
    poor: histogramData[2].density ?? 0,
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
