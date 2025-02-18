"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

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
import { CruxHistoryHistogramTimeseries, CruxHistoryPercentilesTimeseries, CruxHistoryReport, CruxHistoryReportCollectionPeriods } from "../lib/scema"
import { useMemo } from "react"
import { formatDate } from "@/lib/utils"

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

export function HistoricalChart(
    { title, dateRage, histogramData, collectionPeriods }:
    { title: string, dateRage: string, histogramData: CruxHistoryHistogramTimeseries, collectionPeriods: CruxHistoryReportCollectionPeriods }
) {
    const chartData = useMemo(() => {
        if (!histogramData) {
            return []
        }

        const chartData = collectionPeriods.map((period, index) => {
            return {
                date: formatDate(period.lastDate),
                good: histogramData[0].densities[index] ?? 0,
                ni: histogramData[1].densities[index] ?? 0,
                poor: histogramData[2].densities[index] ?? 0,
            }
        })

        return chartData
    }, [histogramData, collectionPeriods]);
    console.log(collectionPeriods)

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{dateRage}</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
            <CardFooter>
            </CardFooter>
        </Card>
    )
}
