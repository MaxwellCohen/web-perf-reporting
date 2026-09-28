"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { useNetworkRequestStats } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";
import type { TableItem } from "@/lib/schema";
import { buildGroupedComparison } from "@/features/page-speed-insights/shared/comparisonChartData";
import { ReportComparisonBarChart } from "@/features/page-speed-insights/shared/ReportComparisonBarChart";

function sumTransferSize(items: TableItem[]): number {
  return items.reduce((total, item) => {
    const value = item.transferSize;
    return total + (typeof value === "number" ? value : 0);
  }, 0);
}

export function ResourceTypeChartCard() {
  const requestStats = useNetworkRequestStats();
  const validStats = requestStats.filter(
    (stat) => stat.byResourceType && Object.keys(stat.byResourceType).length > 0,
  );

  const { series, rows } = buildGroupedComparison(
    validStats.flatMap(({ label, byResourceType }) =>
      Object.entries(byResourceType).map(([type, items]) => ({
        label,
        category: toTitleCase(type),
        value: sumTransferSize(Array.isArray(items) ? (items as TableItem[]) : []),
      })),
    ),
  );

  if (!rows.length) {
    return null;
  }

  const comparing = series.length > 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Resource Type Transfer Size</CardTitle>
        <p className="text-sm text-muted-foreground">
          {comparing
            ? "Transfer size by resource type for each report."
            : "Bytes transferred by resource type."}
        </p>
      </CardHeader>
      <CardContent>
        <ReportComparisonBarChart data={rows} series={series} formatValue={formatBytes} />
      </CardContent>
    </Card>
  );
}
