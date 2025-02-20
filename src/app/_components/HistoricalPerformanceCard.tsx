"use client"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { CruxHistoryHistogramTimeseries, CruxHistoryReportCollectionPeriods } from "@/lib/schema"
import { useMemo, useState } from "react"
import { formatDate } from "@/lib/utils"
import { ChartSelector } from "./ChartSelector"
import { HistoricalPerformanceChartData } from "./ChartSettings"
import dynamic from 'next/dynamic'

const HistoricalPerformanceBarChart = dynamic(() => import("./HistoricalPerformanceBarChart").then(mod => mod.HistoricalPerformanceBarChart))  
const HistoricalPerformanceAreaChart = dynamic(() => import("./HistoricalPerformanceAreaChart").then(mod => mod.HistoricalPerformanceAreaChart))


const ChartMap: Record<string, typeof HistoricalPerformanceAreaChart> = {
    'Area': HistoricalPerformanceAreaChart,
    'Stacked Bar': HistoricalPerformanceBarChart
}


export function HistoricalPerformanceCard(
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
                <ChartSelector onValueChange={(value) => setChartType(value)} options={Object.keys(ChartMap)} />
                <Chart chartData={chartData} />
            </CardContent>
            <CardFooter>
            </CardFooter>
        </Card>
    )
}