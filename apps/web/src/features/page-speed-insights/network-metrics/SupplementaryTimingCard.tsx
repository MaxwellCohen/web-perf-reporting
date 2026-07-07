"use client";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { RenderMSValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { WideMetricsSummaryCardTable } from "@/features/page-speed-insights/shared/WideMetricsSummaryCardTable";
import { useNetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";

export function SupplementaryTimingCard() {
  const series = useNetworkMetricSeries();
  const validMetrics = series.filter(
    (m) =>
      (m.ttfb ?? 0) > 0 ||
      (m.domContentLoaded ?? 0) > 0 ||
      (m.loadTime ?? 0) > 0 ||
      (m.interactive ?? 0) > 0,
  );

  if (!validMetrics.length) {
    return null;
  }

  const showReportColumn = validMetrics.length > 1;

  return (
    <WideMetricsSummaryCardTable
      title="Supplementary Timing Metrics"
      tableClassName="table-auto"
      header={
        <TableRow>
          {showReportColumn && <TableHead className="min-w-20 whitespace-nowrap">Report</TableHead>}
          <TableHead className="min-w-25 whitespace-nowrap">TTFB</TableHead>
          <TableHead className="min-w-30 whitespace-nowrap">DOM Content Loaded</TableHead>
          <TableHead className="min-w-25 whitespace-nowrap">Load</TableHead>
          <TableHead className="min-w-25 whitespace-nowrap">Interactive</TableHead>
        </TableRow>
      }
    >
      {validMetrics.map(({ label, ttfb, domContentLoaded, loadTime, interactive }) => (
        <TableRow key={label}>
          {showReportColumn && (
            <TableCell className="font-medium min-w-20">{label || "Unknown"}</TableCell>
          )}
          <TableCell className="min-w-25">
            <RenderMSValue value={ttfb} />
          </TableCell>
          <TableCell className="min-w-30">
            <RenderMSValue value={domContentLoaded} />
          </TableCell>
          <TableCell className="min-w-25">
            <RenderMSValue value={loadTime} />
          </TableCell>
          <TableCell className="min-w-25">
            <RenderMSValue value={interactive} />
          </TableCell>
        </TableRow>
      ))}
    </WideMetricsSummaryCardTable>
  );
}
