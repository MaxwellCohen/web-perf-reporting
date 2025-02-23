'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CruxHistoryItem } from '@/lib/schema';
import { useMemo, useState } from 'react';
import { ChartSelector } from '../../components/common/ChartSelector';
import { HistoricalPerformanceChartData } from '../../components/common/ChartSettings';
import dynamic from 'next/dynamic';

const HistoricalPerformanceBarChart = dynamic(() =>
  import('./HistoricalPerformanceBarChart').then(
    (mod) => mod.HistoricalPerformanceBarChart,
  ),
);
const HistoricalPerformanceAreaChart = dynamic(() =>
  import('./HistoricalPerformanceAreaChart').then(
    (mod) => mod.HistoricalPerformanceAreaChart,
  ),
);

const ChartMap: Record<string, typeof HistoricalPerformanceAreaChart> = {
  Area: HistoricalPerformanceAreaChart,
  'Stacked Bar': HistoricalPerformanceBarChart,
};

export function HistoricalPerformanceCard({
  histogramData,
  title,
}: {
  histogramData?: CruxHistoryItem[];
  title: string;
}) {
  const [ChartType, setChartType] = useState('Area');

  const chartData: HistoricalPerformanceChartData[] = useMemo(() => {
    if (!histogramData?.length) {
      return [];
    }

    return histogramData
      .map((period) => {
        return {
          date: period.end_date,
          good: period.good_density ?? 0,
          ni: period.ni_density ?? 0,
          poor: period.poor_density ?? 0,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [histogramData]);
  const Chart = ChartMap[ChartType] ?? HistoricalPerformanceAreaChart;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {chartData[0].date} - {chartData?.at(-1)?.date}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartSelector
          onValueChange={(value) => setChartType(value)}
          options={Object.keys(ChartMap)}
        />
        <Chart chartData={chartData} />
      </CardContent>
      <CardFooter></CardFooter>
    </Card>
  );
}
