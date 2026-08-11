"use client";
import { useMemo } from "react";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import {
  useStandardTable,
  type StandardColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";
import { createMSColumn } from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { useTableColumns } from "@/features/page-speed-insights/shared/useTableColumns";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";
import { useNetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";
import type { NetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsData";

type TimingRow = {
  label: string;
  ttfb: number | undefined;
  fcp: number | undefined;
  lcp: number | undefined;
  speedIndex: number | undefined;
  totalBlockingTime: number | undefined;
};

const columnHelper = createStockColumnHelper<TimingRow>();

const cols: StandardColumnDef<TimingRow>[] = [
  createMSColumn(columnHelper, "ttfb", "TTFB"),
  createMSColumn(columnHelper, "fcp", "FCP"),
  createMSColumn(columnHelper, "lcp", "LCP"),
  createMSColumn(columnHelper, "speedIndex", "Speed Index"),
  createMSColumn(columnHelper, "totalBlockingTime", "TBT"),
];

function hasTimingData(m: NetworkMetricSeries): boolean {
  return (
    (m.ttfb ?? 0) > 0 ||
    (m.fcp ?? 0) > 0 ||
    (m.lcp ?? 0) > 0 ||
    (m.speedIndex ?? 0) > 0 ||
    (m.totalBlockingTime ?? 0) > 0
  );
}

export function TimingMetricsCard() {
  const series = useNetworkMetricSeries();
  const validMetrics = useMemo(() => series.filter(hasTimingData), [series]);
  const showReportColumn = validMetrics.length > 1;

  const data = useMemo<TimingRow[]>(
    () =>
      validMetrics.map(({ label, ttfb, fcp, lcp, speedIndex, totalBlockingTime }) => ({
        label,
        ttfb,
        fcp,
        lcp,
        speedIndex,
        totalBlockingTime,
      })),
    [validMetrics],
  );

  const columns = useTableColumns(cols, columnHelper, showReportColumn);
  const table = useStandardTable({ data, columns });

  if (!validMetrics.length) {
    return null;
  }

  return (
    <TableCard title="Page Load Timing Metrics" table={table} className="md:col-span-2 lg:col-span-3" />
  );
}
