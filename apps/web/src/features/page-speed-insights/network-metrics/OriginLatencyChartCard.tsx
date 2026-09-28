"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";
import type { TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import { buildGroupedComparison } from "@/features/page-speed-insights/shared/comparisonChartData";
import {
  formatAxisMs,
  truncateLabel,
} from "@/features/page-speed-insights/shared/horizontalBarChart";
import { ReportComparisonBarChart } from "@/features/page-speed-insights/shared/ReportComparisonBarChart";

const TOP_ORIGINS = 8;

function originName(item: TableItem): string {
  return (
    (typeof item.origin === "string" ? item.origin : "").replace(/^https?:\/\//, "") || "Unknown"
  );
}

export function OriginLatencyChartCard({ mode }: { mode: "rtt" | "latency" }) {
  const metrics = useNetworkMetricSeries();
  const itemsField = mode === "rtt" ? "networkRTT" : "serverLatency";
  const title = mode === "rtt" ? "Top Origins by RTT" : "Top Origins by Server Latency";

  const points = metrics.flatMap((metric) =>
    (metric[itemsField] as TableItem[]).flatMap((item) => {
      const ms = mode === "rtt" ? getNumber(item.rtt) : getNumber(item.serverResponseTime);
      if (ms === undefined) {
        return [];
      }
      return [{ label: metric.label, category: originName(item), value: ms }];
    }),
  );

  const { series, rows } = buildGroupedComparison(points, {
    limit: TOP_ORIGINS,
    aggregate: "max",
  });

  if (!rows.length) {
    return null;
  }

  const comparing = series.length > 1;
  const description =
    mode === "rtt"
      ? comparing
        ? "Round-trip time by origin for each report."
        : "Highest observed round-trip time by origin."
      : comparing
        ? "Server response time by origin for each report."
        : "Highest observed server response time by origin.";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <ReportComparisonBarChart
          data={rows}
          series={series}
          formatValue={formatAxisMs}
          tickFormatter={(value) => truncateLabel(value, 22)}
          yAxis={{ min: 96, max: 140 }}
          showValueAxis
        />
      </CardContent>
    </Card>
  );
}
