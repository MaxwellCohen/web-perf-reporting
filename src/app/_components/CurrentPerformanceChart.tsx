"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis } from "recharts"

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
import { CruxHistogram, CruxHistoryHistogramTimeseries, CruxHistoryPercentilesTimeseries, CruxPercentile } from "../../lib/schema"
import { useMemo } from "react"

const getDensity = (data: CruxHistogram | CruxHistoryHistogramTimeseries, index: number) => {
  if (data instanceof Array) {
    const value = data[index];
    if('density' in value) {
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

const getChartRanges = (data: CruxHistoryHistogramTimeseries) => {
  const ranges = data.map((item) => {
    return item.start;
  });
  return ranges;
}

const MakeChartData = (data?: CruxHistogram ) => {
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
  const extraInfo = [
    `Good: ${data[0]?.start ?? 0} ${data[0]?.end ? `to ${data[0]?.end}` : ""}`,
    `Needs Improvement: ${data[1]?.start ?? 0} ${data[1]?.end ? `to ${data[1]?.end}` : ""}`,
    `Poor: ${data[2]?.start ?? 0} ${data[2]?.end ? `to ${data[2]?.end}` : ""}`,
  ];

  return {
    chartData,
    chartConfig,
    extraInfo
  }
}

export function CurrentPerformanceChart({ title, dateRage, histogramData, percentiles }: { title: string, dateRage: string, histogramData: CruxHistogram , percentiles?: CruxPercentile  }) {
  const { chartData, chartConfig, extraInfo } = useMemo(() => MakeChartData(histogramData), [histogramData]);
  if (!chartData.length) {
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
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            P75 is {percentiles && 'p75' in percentiles ? percentiles.p75 :  'N/A'}
          </div>
          {extraInfo.map((info, idx) => <div className="leading-none text-muted-foreground" key={`${idx}-${info}`}>
            {info}
          </div>)}
        </CardFooter>
      </Card>
    </div>
  )
}
