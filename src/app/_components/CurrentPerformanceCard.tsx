"use client"
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

import { CruxHistogram, CruxHistoryHistogramTimeseries, CruxPercentile, UserPageLoadMetricV5 } from "../../lib/schema"
import { useMemo, useState } from "react"
import { ChartSelector } from "./ChartSelector"
import { chartConfig, PerformanceChartData } from "./ChartSettings"
import { RadialChart } from "./PerformanceRadialChart"
import { PerformanceStackedBarChart } from "./PerformanceStackedBarChart"
import GaugeChart from "./PageSpeedGuageChart"

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


const makeHistogramData = (data?: CruxHistogram) => {
  if (!data) {
    return {
      chartData: [] as PerformanceChartData[],
      chartConfig: {} satisfies ChartConfig,
      extraInfo: [] as string[],
    }
  }

  const chartData: PerformanceChartData[] = [
    { status: "good", density: getDensity(data, 0), fill: "var(--color-good)" },
    { status: "ni", density: getDensity(data, 1), fill: "var(--color-ni)" },
    { status: "poor", density: getDensity(data, 2), fill: "var(--color-poor)" },
  ];

  return {
    chartData,
  }
}

const ChartMap: Record<string, typeof CurrentGaugeChart> = {
  'Histogram': Histogram,
  'Stacked Bar': PerformanceStackedBarChart,
  'Radial Chart': RadialChart,
  'Gauge Chart': CurrentGaugeChart
}

export function CurrentPerformanceCard({ title, dateRage, histogramData, percentiles }: { title: string, dateRage: string, histogramData: CruxHistogram, percentiles?: CruxPercentile }) {
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
          <Chart histogramData={histogramData} percentiles={percentiles?.p75} />
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


function CurrentGaugeChart({ histogramData, percentiles }: { histogramData: CruxHistogram, percentiles?: number | string }) {
  const data: UserPageLoadMetricV5 = {
    "percentile": +(percentiles ?? 0),
    "category": '',
    "distributions": [
      {
        "min": histogramData[0]?.start ?? 0,
        "max": histogramData[0]?.end ?? 0,
        proportion: histogramData[0]?.density ?? 0,
      },
      {
        "min": histogramData[1]?.start ?? 0,
        "max": histogramData[1]?.end ?? 0,
        proportion: histogramData[1]?.density ?? 0,
      },
      {
        "min": histogramData[2]?.start ?? 0,
        "max": histogramData[2]?.end ?? 0,
        proportion: histogramData[2]?.density ?? 0,
      }
    ]
  }

return (<GaugeChart metric={""} data={data} />)
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