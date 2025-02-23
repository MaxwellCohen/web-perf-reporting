'use client';

import { CruxReport } from '@/lib/schema';
import { formatCruxReport, formatDate, groupBy } from '@/lib/utils';
import {
  ChartMap,
  CurrentPerformanceCard,
  CurrentPerformanceChartContext,
} from '@/components/latest-crux/PerformanceCard';
import { useId, useState } from 'react';
import { PercentTable } from '@/components/common/FormFactorPercentPieChart';

import { PerformanceOptions } from './PerformanceOptions';


type Scope = 'origin' | 'url';
type DeviceType = 'All' | 'DESKTOP' | 'TABLET' | 'PHONE';

export function CurrentPerformanceDashboard({
  reportMap,
}: {
  reportMap: Record<`${Scope}${DeviceType}`, CruxReport | null>;
}) {
  const id = useId()
  const [ChartType, setChartType] = useState('bar');
  const [reportScope, setReportScope] = useState<Scope>('origin');
  const [deviceType, setDeviceType] = useState<DeviceType>('All');
  const report = reportMap[`${reportScope}${deviceType}`];
  const data = formatCruxReport(report);


  const groupedMetics = data ? groupBy(data, ({ metric_name }) => metric_name || '') : {};
  const form_factors = reportMap[`${reportScope}All`]?.record?.metrics?.form_factors?.fractions;
  const navigation_types = report?.record?.metrics?.navigation_types?.fractions;
  const collectionPeriod = report?.record?.collectionPeriod
  return (
    <CurrentPerformanceChartContext.Provider value={ChartType}>
      <h2 className="text-xl">
        Latest Performance Report for
        {collectionPeriod ? ` ${formatDate(collectionPeriod.firstDate)} - ${formatDate(collectionPeriod.lastDate)}` : null}
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
            className='md:grid md:grid-cols-[auto,1fr] gap-2 pl-2 justify-between items-center flex-row flex-1 min-w-full md:min-w-[300px] '
          />
        ) : null}
      </PerformanceOptions>
      <div className="mt-2 grid gap-1 grid-cols-3 md:grid-cols-3 lg:grid-cols-6">
        <CurrentPerformanceCard
          title="Largest Contentful Paint (LCP)"
          histogramData={groupedMetics?.largest_contentful_paint?.[0]}
        />
        <CurrentPerformanceCard
          title="Interaction to Next Paint (INP)"
          histogramData={groupedMetics?.interaction_to_next_paint?.[0]}
        />
        <CurrentPerformanceCard
          title="Cumulative Layout Shift (CLS)"
          histogramData={groupedMetics?.cumulative_layout_shift?.[0]}
        />
        <CurrentPerformanceCard
          title="First Contentful Paint (FCP)"
          histogramData={groupedMetics?.first_contentful_paint?.[0]}
        />
        <CurrentPerformanceCard
          title="Time to First Byte (TTFB)"
          histogramData={groupedMetics?.experimental_time_to_first_byte?.[0]}
        />
        <CurrentPerformanceCard
          title="Round Trip Time (RTT)"
          histogramData={groupedMetics?.round_trip_time?.[0]}
        />
      </div>
      {navigation_types ? (
        <PercentTable
          title="Navigation Types"
          data={navigation_types}
        />
      ) : null}

    </CurrentPerformanceChartContext.Provider >
  );
}
