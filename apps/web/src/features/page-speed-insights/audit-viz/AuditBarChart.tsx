"use client";

import { buildGroupedComparison } from "@/features/page-speed-insights/shared/comparisonChartData";
import { formatBytes, formatMs } from "@/features/page-speed-insights/shared/format";
import { ReportComparisonBarChart } from "@/features/page-speed-insights/shared/ReportComparisonBarChart";
import { truncateLabel } from "@/features/page-speed-insights/shared/horizontalBarChart";
import type { LabeledValue } from "@/features/page-speed-insights/shared/comparisonChartData";

type Unit = "bytes" | "ms" | "score" | "count";

const FORMATTERS: Record<Unit, (value: number) => string> = {
  bytes: formatBytes,
  ms: formatMs,
  score: (value) => value.toFixed(3),
  count: (value) => Math.round(value).toLocaleString(),
};

export function AuditBarChart({
  points,
  unit,
  limit = 12,
  title,
}: {
  points: LabeledValue[];
  unit: Unit;
  limit?: number;
  title?: string;
}) {
  const { series, rows } = buildGroupedComparison(points, { limit, order: "magnitude" });
  if (!rows.length) return null;

  return (
    <div className="w-full min-w-0 space-y-2">
      {title ? <p className="text-sm font-medium text-muted-foreground">{title}</p> : null}
      <ReportComparisonBarChart
        data={rows}
        series={series}
        formatValue={FORMATTERS[unit]}
        tickFormatter={(value) => truncateLabel(value, 28)}
        showValueAxis={series.length > 1}
        yAxis={{ min: 96, max: 180 }}
      />
    </div>
  );
}
