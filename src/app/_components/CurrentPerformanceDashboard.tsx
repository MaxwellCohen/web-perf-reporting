'use client';

import { CruxReport } from '@/lib/schema';
import { formatCruxReport, groupBy } from '@/lib/utils';
import { ChartMap, CurrentPerformanceCard, CurrentPerformanceChartContext } from './CurrentPerformanceCard';
import { ChartSelector } from './ChartSelector';
import { useState } from 'react';

export function CurrentPerformanceDashboard({
  report,
}: {
  report: CruxReport;
}) {
  const [ChartType, setChartType] = useState('bar');
  const data = formatCruxReport(report);
  if (!data) {
    return null;
  }
  const groupedMetics = groupBy(data, ({ metric_name }) => metric_name || '');
  const form_factors = report?.record?.metrics?.form_factors?.fractions;
  return (

    <CurrentPerformanceChartContext.Provider value={ChartType}>
      <h3>{`Date Range: ${groupedMetics?.cumulative_layout_shift?.[0].start_date} - ${groupedMetics?.cumulative_layout_shift?.[0].end_date}`}</h3>
      <ChartSelector
            onValueChange={(value) => setChartType(value)}
            options={Object.keys(ChartMap)}
          />

      {form_factors ? (
        <div>
          <strong>Desktop</strong> {form_factors.desktop * 100} %
          <strong>Phone</strong> {form_factors.phone * 100} %
          <strong>tablet</strong> {form_factors.tablet * 100} %
        </div>
      ) : null}
      <div className="mt-2 grid gap-1 md:grid-cols-3 lg:grid-cols-6">
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
    </CurrentPerformanceChartContext.Provider>
  );
}
