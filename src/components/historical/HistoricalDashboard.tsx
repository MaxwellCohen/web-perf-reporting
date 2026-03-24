"use client";
import { CruxReport } from '@/lib/schema';
import { formatCruxReport, formatDate, groupBy } from '@/lib/utils';
import { CurrentPerformanceChartContext } from '@/components/latest-crux/PerformanceCard';
import { useState, useMemo } from 'react';

import {
  DeviceType,
  PerformanceOptions,
  Scope,
  DateRange,
} from '@/components/latest-crux/PerformanceOptions';
import {
  ChartMap,
  HistoricalPerformanceCard,
} from '@/components/historical/HistoricalPerformanceCard';
import { PercentTable } from '@/components/common/FormFactorPercentPieChart';
import { Details } from '@/components/ui/accordion';

// Helper function to convert CruxDate to YYYY-MM-DD string
function cruxDateToDateString(cruxDate: { year: number; month: number; day: number }): string {
  const month = String(cruxDate.month).padStart(2, '0');
  const day = String(cruxDate.day).padStart(2, '0');
  return `${cruxDate.year}-${month}-${day}`;
}

export function HistoricalDashboard({
  reportMap,
}: {
  reportMap: Record<`${Scope}${DeviceType}`, CruxReport[] | null>;
}) {
  const [ChartType, setChartType] = useState('bar');
  const [reportScope, setReportScope] = useState<Scope>('origin');
  const [deviceType, setDeviceType] = useState<DeviceType>('All');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(null);

  // Get all reports for the current scope and device type
  const allReports = useMemo(() => {
    return reportMap[`${reportScope}${deviceType}`] || [];
  }, [reportMap, reportScope, deviceType]);

  // Calculate available date range from reports
  const dateRange = useMemo(() => {
    if (allReports.length === 0) {
      return { startDate: null, endDate: null };
    }
    const firstDate = allReports[0]?.record?.collectionPeriod.lastDate;
    const lastDate = allReports.at(-1)?.record?.collectionPeriod.lastDate;
    
    if (firstDate && lastDate) {
      return {
        startDate: cruxDateToDateString(firstDate),
        endDate: cruxDateToDateString(lastDate),
      };
    }
    return { startDate: null, endDate: null };
  }, [allReports]);

  // Use selected date range if set, otherwise use available date range
  const activeDateRange = selectedDateRange || dateRange;

  // Filter reports based on date range
  const reports = useMemo(() => {
    if (!activeDateRange.startDate && !activeDateRange.endDate) {
      return allReports;
    }

    return allReports.filter((report) => {
      const reportDate = cruxDateToDateString(report.record.collectionPeriod.lastDate);
      
      if (activeDateRange.startDate && reportDate < activeDateRange.startDate) {
        return false;
      }
      if (activeDateRange.endDate && reportDate > activeDateRange.endDate) {
        return false;
      }
      return true;
    });
  }, [allReports, activeDateRange]);

  // Get filtered reports for "All" device type to calculate form factors
  const allDeviceReports = useMemo(() => {
    const allDeviceAllReports = reportMap[`${reportScope}All`] || [];
    
    if (!activeDateRange.startDate && !activeDateRange.endDate) {
      return allDeviceAllReports;
    }

    return allDeviceAllReports.filter((report) => {
      const reportDate = cruxDateToDateString(report.record.collectionPeriod.lastDate);
      
      if (activeDateRange.startDate && reportDate < activeDateRange.startDate) {
        return false;
      }
      if (activeDateRange.endDate && reportDate > activeDateRange.endDate) {
        return false;
      }
      return true;
    });
  }, [reportMap, reportScope, activeDateRange]);

  const data = reports
    .map((report) => formatCruxReport(report))
    .flatMap((i) => i)
    .filter((i) => !!i);
  const form_factors =
    allDeviceReports.at(-1)?.record?.metrics?.form_factors?.fractions;
  const form_factors_date_range = allDeviceReports.at(-1)?.record?.collectionPeriod;
  const groupedMetics = data
    ? groupBy(data, ({ metric_name }) => metric_name || '')
    : {};
  const firstDate = reports[0]?.record?.collectionPeriod.lastDate;
  const endDate = reports.at(-1)?.record?.collectionPeriod.lastDate;
  return (
    <CurrentPerformanceChartContext.Provider value={ChartType}>
      <Details>
      <summary  className="flex flex-col gap-2 p-2"><h2 className="text-xl">
        Historical CrUX Report for
        {firstDate ? ` ${formatDate(firstDate)}` : null}{' '}
        {firstDate && endDate ? ` to ${formatDate(endDate)}` : null}
      </h2></summary>
      <PerformanceOptions
        setChartType={setChartType}
        setReportScope={setReportScope}
        setDeviceType={setDeviceType}
        chartKeys={Object.keys(ChartMap)}
        dateRange={activeDateRange}
        setDateRange={(range) => setSelectedDateRange(range)}
      >
        {form_factors ? (
          <PercentTable
            title={'Form Factors'}
            data={form_factors}
            className="min-w-full flex-1 flex-row items-center justify-between gap-2 pl-2 md:grid md:min-w-75 md:grid-cols-[auto,1fr]"
            dateRange={
              form_factors_date_range
                ? `${formatDate(form_factors_date_range.firstDate)} - ${formatDate(form_factors_date_range.lastDate)}`
                : undefined
            }
          />
        ) : null}
      </PerformanceOptions>
      <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(14.5rem,1fr))] flex-wrap gap-1">
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
      </Details>
    </CurrentPerformanceChartContext.Provider>
  );
}
