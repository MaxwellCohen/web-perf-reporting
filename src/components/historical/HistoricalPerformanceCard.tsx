'use client';
import { Card } from '@/components/ui/card';
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
    <Card className="grid h-full grid-rows-[2.5rem_1fr_1fr_4rem]  gap-3">
      <h3 className="text-md text-center self-center justify-self-center font-bold">{title}</h3>
      <div className="grid grid-row-[auto_1fr]"><h4 className="text-sm text-muted-foreground px-2">Density</h4><Chart chartData={chartData} /></div>
      <div className="grid grid-row-[auto_1fr]"><h4 className="text-sm text-muted-foreground px-2">P75</h4><HistoricalP75Chart chartData={chartData} /></div>
      <div className="text-sm pb-2 px-2 text-muted-foreground">
        <div><strong>Good:</strong> 0 to {histogramData?.[0]?.good_max ?? 0}</div>
        <div><strong>Needs Improvement:</strong> {histogramData?.[0]?.good_max ?? 0} to {histogramData?.[0]?.ni_max ?? 0}</div>
        <div><strong>Poor:</strong> {histogramData?.[0]?.ni_max ?? 0} and above</div>
      </div>
    </Card>
  );
}
