"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts"

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
import { CruxHistoryHistogramTimeseries, CruxHistoryReportCollectionPeriods } from "@/lib/schema"
import { useMemo, useState } from "react"
import { formatDate } from "@/lib/utils"
import { ChartSelector } from "./ChartSelector"

const HistoricalPerformanceChartConfig = {
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
} satisfies ChartConfig

export type HistoricalPerformanceChartData = {
    date: string;
    good: number;
    ni: number;
    poor: number;
};

const ChartMap: Record<string, typeof HistoricalPerformanceAreaChart> = {
    'Area': HistoricalPerformanceAreaChart,
    'Stacked Bar': HistoricalPerformanceBarChart
}
export function HistoricalChart(
    { title, dateRage, histogramData, collectionPeriods }:
        { title: string, dateRage: string, histogramData: CruxHistoryHistogramTimeseries, collectionPeriods: CruxHistoryReportCollectionPeriods }
) {
    const [ChartType, setChartType] = useState('Area')

    const chartData: HistoricalPerformanceChartData[] = useMemo(() => {
        if (!histogramData) {
            return [];
        }

        const chartData = collectionPeriods.map((period, index) => {
            return {
                date: formatDate(period.lastDate),
                good: histogramData[0].densities[index] ?? 0,
                ni: histogramData[1].densities[index] ?? 0,
                poor: histogramData[2].densities[index] ?? 0,
            };
        });

        return chartData;
    }, [histogramData, collectionPeriods]);
    const Chart = ChartMap[ChartType] ?? HistoricalPerformanceAreaChart;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{dateRage}</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartSelector onValueChange={(value) => setChartType(value)} options={Object.keys(ChartMap)}/>
                <Chart chartData={chartData} />
            </CardContent>
            <CardFooter>
            </CardFooter>
        </Card>
    )
}

function HistoricalPerformanceAreaChart({ chartData }: { chartData: HistoricalPerformanceChartData[] }) {
    return (
        <ChartContainer config={HistoricalPerformanceChartConfig}>
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
    )
}


function HistoricalPerformanceBarChart({ chartData }: { chartData: HistoricalPerformanceChartData[] }) {
    return (
        <ChartContainer config={HistoricalPerformanceChartConfig}>
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