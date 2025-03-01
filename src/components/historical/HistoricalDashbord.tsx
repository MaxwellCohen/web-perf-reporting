'use client';

import { CruxReport } from '@/lib/schema';
import { formatCruxReport, formatDate, groupBy } from '@/lib/utils';
import { CurrentPerformanceChartContext } from '@/components/latest-crux/PerformanceCard';
import { useState } from 'react';

import {
  DeviceType,
  PerformanceOptions,
  Scope,
} from '../latest-crux/PerformanceOptions';
import {
  ChartMap,
  HistoricalPerformanceCard,
} from './HistoricalPerformanceCard';
import { PercentTable } from '../common/FormFactorPercentPieChart';

export function HistoricalDashboard({
  reportMap,
}: {
  reportMap: Record<`${Scope}${DeviceType}`, CruxReport[] | null>;
}) {
  const [ChartType, setChartType] = useState('bar');
  const [reportScope, setReportScope] = useState<Scope>('origin');
  const [deviceType, setDeviceType] = useState<DeviceType>('All');
  const reports = reportMap[`${reportScope}${deviceType}`] || [];
  const data = reports
    .map((report) => formatCruxReport(report))
    .flatMap((i) => i)
    .filter((i) => !!i);
  const form_factors =
    reportMap[`${reportScope}All`]?.at(-1)?.record?.metrics?.form_factors
      ?.fractions;

  const groupedMetics = data
    ? groupBy(data, ({ metric_name }) => metric_name || '')
    : {};
  const firstDate = reports[0]?.record?.collectionPeriod.lastDate;
  const endDate = reports.at(-1)?.record?.collectionPeriod.lastDate;
  return (
    <CurrentPerformanceChartContext.Provider value={ChartType}>
      <h2 className="text-xl">
        Historical CrUX Report for
        {firstDate ? ` ${formatDate(firstDate)}` : null}{' '}
        {firstDate && endDate ? ` to ${formatDate(endDate)}` : null}
      </h2>
      <PerformanceOptions
        setChartType={setChartType}
        setReportScope={setReportScope}
        setDeviceType={setDeviceType}
        chartKeys={Object.keys(ChartMap)}
      >
        {form_factors ? (
          <PercentTable
            title={'Form Factors'}
            data={form_factors}
            className="min-w-full flex-1 flex-row items-center justify-between gap-2 pl-2 md:grid md:min-w-[300px] md:grid-cols-[auto,1fr]"
          />
        ) : null}
      </PerformanceOptions>
      <div className="mt-2 grid grid-cols-[repeat(auto-fill,_minmax(14.5rem,_1fr))] flex-wrap gap-1">
        <HistoricalPerformanceCard
          title="Largest Contentful Paint (LCP)"
          histogramData={groupedMetics?.largest_contentful_paint}
        />
        <HistoricalPerformanceCard
          title="Interaction to Next Paint (INP)"
          histogramData={groupedMetics?.interaction_to_next_paint}
        />
        <HistoricalPerformanceCard
          title="Cumulative Layout Shift (CLS)"
          histogramData={groupedMetics?.cumulative_layout_shift}
        />
        <HistoricalPerformanceCard
          title="First Contentful Paint (FCP)"
          histogramData={groupedMetics?.first_contentful_paint}
        />
        <HistoricalPerformanceCard
          title="Time to First Byte (TTFB)"
          histogramData={groupedMetics?.experimental_time_to_first_byte}
        />
        <HistoricalPerformanceCard
          title="Round Trip Time (RTT)"
          histogramData={groupedMetics?.round_trip_time}
        />
      </div>
    </CurrentPerformanceChartContext.Provider>
  );
}
