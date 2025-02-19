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

const chartConfig = {
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

type ChartData = {
    date: string;
    good: number;
    ni: number;
    poor: number;
};

const ChartMap: Record<string, typeof MyAreaChart> = {
    'Area': MyAreaChart,
    'Stacked Bar': MyBarChart
}

export function HistoricalChart(
    { title, dateRage, histogramData, collectionPeriods }:
        { title: string, dateRage: string, histogramData: CruxHistoryHistogramTimeseries, collectionPeriods: CruxHistoryReportCollectionPeriods }
) {
    const [ChartType, setChartType] = useState('Area')

    const chartData: ChartData[] = useMemo(() => {
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
    const Chart = ChartMap[ChartType] ?? MyAreaChart;

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

function MyAreaChart({ chartData }: { chartData: ChartData[] }) {
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
    )
}


function MyBarChart({ chartData }: { chartData: ChartData[] }) {
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