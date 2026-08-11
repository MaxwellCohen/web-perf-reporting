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

type SupplementaryTimingRow = {
  label: string;
  ttfb: number | undefined;
  domContentLoaded: number | undefined;
  loadTime: number | undefined;
  interactive: number | undefined;
};

const columnHelper = createStockColumnHelper<SupplementaryTimingRow>();

const cols: StandardColumnDef<SupplementaryTimingRow>[] = [
  createMSColumn(columnHelper, "ttfb", "TTFB"),
  createMSColumn(columnHelper, "domContentLoaded", "DOM Content Loaded"),
  createMSColumn(columnHelper, "loadTime", "Load"),
  createMSColumn(columnHelper, "interactive", "Interactive"),
];

function hasSupplementaryData(m: NetworkMetricSeries): boolean {
  return (
    (m.ttfb ?? 0) > 0 ||
    (m.domContentLoaded ?? 0) > 0 ||
    (m.loadTime ?? 0) > 0 ||
    (m.interactive ?? 0) > 0
  );
}

export function SupplementaryTimingCard() {
  const series = useNetworkMetricSeries();
  const validMetrics = useMemo(() => series.filter(hasSupplementaryData), [series]);
  const showReportColumn = validMetrics.length > 1;

  const data = useMemo<SupplementaryTimingRow[]>(
    () =>
      validMetrics.map(({ label, ttfb, domContentLoaded, loadTime, interactive }) => ({
        label,
        ttfb,
        domContentLoaded,
        loadTime,
        interactive,
      })),
    [validMetrics],
  );

  const columns = useTableColumns(cols, columnHelper, showReportColumn);
  const table = useStandardTable({ data, columns });

  if (!validMetrics.length) {
    return null;
  }

  return (
    <TableCard
      title="Supplementary Timing Metrics"
      table={table}
      className="md:col-span-2 lg:col-span-3"
    />
  );
}
