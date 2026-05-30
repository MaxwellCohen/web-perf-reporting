"use client";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { RenderMSValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { WideMetricsSummaryCardTable } from "@/features/page-speed-insights/shared/WideMetricsSummaryCardTable";
import { useNetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";

function TimingValue({ value, category }: { value?: number; category?: string }) {
  if (value === undefined) return <span className="text-muted-foreground">N/A</span>;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="whitespace-nowrap">
        <RenderMSValue value={value} />
      </span>
      {category && (
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            category === "FAST"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : category === "AVERAGE"
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}
        >
          {category}
        </span>
      )}
    </div>
  );
}

export function TimingMetricsCard() {
  const series = useNetworkMetricSeries();
  const validMetrics = series.filter(
    (m) =>
      (m.ttfb ?? 0) > 0 ||
      (m.fcp ?? 0) > 0 ||
      (m.lcp ?? 0) > 0 ||
      (m.speedIndex ?? 0) > 0 ||
      (m.totalBlockingTime ?? 0) > 0,
  );

  if (!validMetrics.length) {
    return null;
  }

  const showReportColumn = validMetrics.length > 1;

  return (
    <WideMetricsSummaryCardTable
      title="Page Load Timing Metrics"
      tableClassName="table-auto"
      header={
        <TableRow>
          {showReportColumn && <TableHead className="min-w-20 whitespace-nowrap">Report</TableHead>}
          <TableHead className="min-w-25 whitespace-nowrap">TTFB</TableHead>
          <TableHead className="min-w-25 whitespace-nowrap">FCP</TableHead>
          <TableHead className="min-w-25 whitespace-nowrap">LCP</TableHead>
          <TableHead className="min-w-30 whitespace-nowrap">Speed Index</TableHead>
          <TableHead className="min-w-25 whitespace-nowrap">TBT</TableHead>
        </TableRow>
      }
    >
      {validMetrics.map(({ label, ttfb, fcp, lcp, speedIndex, totalBlockingTime }) => (
        <TableRow key={label}>
          {showReportColumn && (
            <TableCell className="font-medium min-w-20">{label || "Unknown"}</TableCell>
          )}
          <TableCell className="min-w-25">
            <TimingValue value={ttfb} />
          </TableCell>
          <TableCell className="min-w-25">
            <TimingValue value={fcp} />
          </TableCell>
          <TableCell className="min-w-25">
            <TimingValue value={lcp} />
          </TableCell>
          <TableCell className="min-w-30">
            <TimingValue value={speedIndex} />
          </TableCell>
          <TableCell className="min-w-25">
            <TimingValue value={totalBlockingTime} />
          </TableCell>
        </TableRow>
      ))}
    </WideMetricsSummaryCardTable>
  );
}
