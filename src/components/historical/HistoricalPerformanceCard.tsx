'use client';
import {
  Card,
} from '@/components/ui/card';
import { CruxHistoryItem } from '@/lib/schema';
import { useContext, useMemo } from 'react';
import { HistoricalPerformanceChartData } from '../../components/common/ChartSettings';
import dynamic from 'next/dynamic';
import { CurrentPerformanceChartContext } from '../latest-crux/PerformanceCard';
import { HistoricalP75Chart } from './HistoricalPerformanceAreaChart';

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

export const ChartMap: Record<string, typeof HistoricalPerformanceAreaChart> = {
  Area: HistoricalPerformanceAreaChart,
  'Stacked Bar': HistoricalPerformanceBarChart,
};

export function HistoricalPerformanceCard({
  histogramData,
  title,
}: {
  histogramData?: CruxHistoryItem[] | null;
  title: string;
}) {

  const ChartType = useContext(CurrentPerformanceChartContext);

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
          ...period,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [histogramData]);
  const Chart = ChartMap[ChartType] ?? HistoricalPerformanceAreaChart;

  return (
    <Card className="grid h-full grid-cols-1 grid-rows-[52px_1fr_1fr] gap-3 p-2">
      <div className="text-md text-center font-bold">{title}</div>
      <Chart chartData={chartData} />
      <HistoricalP75Chart chartData={chartData} />
    </Card>
  );
}
