"use client";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  barEndRadius,
  buildKeyedChartConfig,
  formatAxisMs,
  horizontalBarChartClassName,
  horizontalBarChartHeight,
  mutedBarCursor,
  truncateLabel,
  yAxisWidthForLabels,
} from "@/features/page-speed-insights/shared/horizontalBarChart";
import { formatBytes } from "@/features/page-speed-insights/shared/format";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type SegmentPoint = {
  label: string;
  category: string;
  segment: string;
  value: number;
};

type Unit = "bytes" | "ms";

export function AuditStackedBarChart({
  points,
  segmentOrder,
  segmentLabels,
  unit,
  title,
  limit = 12,
}: {
  points: SegmentPoint[];
  segmentOrder: string[];
  segmentLabels: Record<string, string>;
  unit: Unit;
  title?: string;
  limit?: number;
}) {
  if (!points.length) return null;

  const formatValue = unit === "bytes" ? formatBytes : formatAxisMs;
  const reportLabels = [...new Set(points.map((point) => point.label))];
  const comparing = reportLabels.length > 1;

  // Single-report: one stacked row per category.
  // Multi-report: flatten to "category · report" rows with stacked segments.
  const categoryTotals = new Map<string, number>();
  for (const point of points) {
    categoryTotals.set(point.category, (categoryTotals.get(point.category) ?? 0) + point.value);
  }
  const topCategories = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category]) => category);
  const topSet = new Set(topCategories);

  const rowMap = new Map<string, Record<string, string | number>>();
  for (const point of points) {
    if (!topSet.has(point.category)) continue;
    const rowKey = comparing ? `${point.category} · ${point.label}` : point.category;
    let row = rowMap.get(rowKey);
    if (!row) {
      row = { category: rowKey };
      rowMap.set(rowKey, row);
    }
    row[point.segment] = (Number(row[point.segment]) || 0) + point.value;
  }

  const data = [...rowMap.values()].sort((a, b) => {
    const totalA = segmentOrder.reduce((sum, key) => sum + (Number(a[key]) || 0), 0);
    const totalB = segmentOrder.reduce((sum, key) => sum + (Number(b[key]) || 0), 0);
    return totalB - totalA;
  });

  if (!data.length) return null;

  const series = segmentOrder.map((key) => ({
    key,
    label: segmentLabels[key] ?? key,
  }));
  const config = buildKeyedChartConfig(series);
  const chartHeight = horizontalBarChartHeight(data.length, { legend: true, rowPx: 36 });
  const yAxisWidth = yAxisWidthForLabels(
    data.map((row) => truncateLabel(String(row.category ?? ""), 32)),
    { min: 96, max: 200 },
  );

  return (
    <div className="w-full min-w-0 space-y-2">
      {title ? <p className="text-sm font-medium text-muted-foreground">{title}</p> : null}
      <ChartContainer
        config={config}
        className={horizontalBarChartClassName}
        style={{ height: `${chartHeight}px` }}
      >
        <BarChart
          accessibilityLayer
          data={data}
          layout="vertical"
          margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
          barCategoryGap="22%"
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => formatValue(Number(value))}
          />
          <YAxis
            type="category"
            dataKey="category"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            width={yAxisWidth}
            interval={0}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => truncateLabel(String(value), 32)}
          />
          <ChartTooltip
            cursor={mutedBarCursor}
            content={
              <ChartTooltipContent
                indicator="dot"
                formatter={(value, name) => (
                  <span className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      {segmentLabels[String(name)] ?? String(name)}
                    </span>
                    <span className="font-mono font-medium tabular-nums">
                      {formatValue(Number(value))}
                    </span>
                  </span>
                )}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-2" />} />
          {segmentOrder.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              name={key}
              stackId="a"
              fill={`var(--color-${key})`}
              radius={index === segmentOrder.length - 1 ? barEndRadius : [0, 0, 0, 0]}
              maxBarSize={22}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  );
}
