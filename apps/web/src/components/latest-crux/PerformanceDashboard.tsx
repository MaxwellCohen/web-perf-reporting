"use client";

import {
  ChartMap,
  CurrentPerformanceCard,
  CurrentPerformanceChartContext,
} from "@/components/latest-crux/PerformanceCard";
import { PerformanceOptions } from "@/components/latest-crux/PerformanceOptions";
import type { CruxReportMap, DeviceType, Scope } from "@/components/latest-crux/types";
import { PercentTable } from "@/components/common/PercentTable";
import { AdMetricsTable } from "@/components/common/AdMetricsTable";
import { formatCruxReport, formatDate, groupBy } from "@/lib/utils";
import { useState } from "react";
import { LoadingMessage } from "@/components/common/LoadingMessage";

const softNavMetricNames = [
  "experimental_largest_contentful_paint_with_softnavs",
  "experimental_interaction_to_next_paint_with_softnavs",
  "experimental_cumulative_layout_shift_with_softnavs",
];

export function CurrentPerformanceDashboard({
  reportMap,
  pendingKeys = [],
}: {
  reportMap: CruxReportMap;
  pendingKeys?: readonly string[];
}) {
  const [ChartType, setChartType] = useState("bar");
  const [reportScope, setReportScope] = useState<Scope>("origin");
  const [deviceType, setDeviceType] = useState<DeviceType>("All");
  const slotKey = `${reportScope}${deviceType}` as keyof CruxReportMap;
  const slotPending = pendingKeys.includes(slotKey);
  const report = reportMap[slotKey];
  const data = formatCruxReport(report);

  const groupedMetrics = data ? groupBy(data, ({ metric_name }) => metric_name || "") : {};
  const form_factors = reportMap[`${reportScope}All`]?.record?.metrics?.form_factors?.fractions;
  const form_factors_date_range = reportMap[`${reportScope}All`]?.record?.collectionPeriod;
  const navigation_types = report?.record?.metrics?.navigation_types?.fractions;
  const collectionPeriod = report?.record?.collectionPeriod;
  const hasSoftNavMetrics = softNavMetricNames.some((name) => groupedMetrics?.[name]?.length);
  return (
    <CurrentPerformanceChartContext.Provider value={ChartType}>
      <h2 className="text-lg">
        Latest Performance Report for
        {collectionPeriod
          ? ` ${formatDate(collectionPeriod.firstDate)} - ${formatDate(collectionPeriod.lastDate)}`
          : null}
      </h2>
      <PerformanceOptions
        setChartType={setChartType}
        setReportScope={setReportScope}
        setDeviceType={setDeviceType}
        chartKeys={Object.keys(ChartMap)}
      >
        {form_factors ? (
          <PercentTable
            title={"Form Factors"}
            data={form_factors}
            dateRange={
              form_factors_date_range
                ? `${formatDate(form_factors_date_range.firstDate)} - ${formatDate(form_factors_date_range.lastDate)}`
                : undefined
            }
            className="md:grid md:grid-cols-[auto,1fr] gap-2 pl-2 justify-between items-center flex-row flex-1 min-w-full md:min-w-75 "
          />
        ) : null}
      </PerformanceOptions>
      {slotPending ? (
        <LoadingMessage variant="crux" />
      ) : (
      <div className="mt-2 grid gap-1 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 print:grid-cols-3">
        <CurrentPerformanceCard
          title="Largest Contentful Paint (LCP)"
          histogramData={groupedMetrics?.largest_contentful_paint?.[0]}
        />
        <CurrentPerformanceCard
          title="Interaction to Next Paint (INP)"
          histogramData={groupedMetrics?.interaction_to_next_paint?.[0]}
        />
        <CurrentPerformanceCard
          title="Cumulative Layout Shift (CLS)"
          histogramData={groupedMetrics?.cumulative_layout_shift?.[0]}
        />
        <CurrentPerformanceCard
          title="First Contentful Paint (FCP)"
          histogramData={groupedMetrics?.first_contentful_paint?.[0]}
        />
        <CurrentPerformanceCard
          title="Time to First Byte (TTFB)"
          histogramData={groupedMetrics?.experimental_time_to_first_byte?.[0]}
        />
        <CurrentPerformanceCard
          title="Round Trip Time (RTT)"
          histogramData={groupedMetrics?.round_trip_time?.[0]}
        />
      </div>
      )}
      {!slotPending && hasSoftNavMetrics ? (
        <>
          <h3 className="mt-4 text-md">
            Core Web Vitals including soft navigations (experimental)
          </h3>
          <div className="mt-2 grid gap-1 grid-cols-2 md:grid-cols-3 print:grid-cols-3">
            <CurrentPerformanceCard
              title="LCP with Soft Navigations"
              histogramData={groupedMetrics?.experimental_largest_contentful_paint_with_softnavs?.[0]}
            />
            <CurrentPerformanceCard
              title="INP with Soft Navigations"
              histogramData={groupedMetrics?.experimental_interaction_to_next_paint_with_softnavs?.[0]}
            />
            <CurrentPerformanceCard
              title="CLS with Soft Navigations"
              histogramData={groupedMetrics?.experimental_cumulative_layout_shift_with_softnavs?.[0]}
            />
          </div>
        </>
      ) : null}
      {navigation_types ? <PercentTable title="Navigation Types" data={navigation_types} /> : null}
      {!slotPending ? <AdMetricsTable className="mt-1" metrics={report?.record?.metrics} /> : null}
    </CurrentPerformanceChartContext.Provider>
  );
}
