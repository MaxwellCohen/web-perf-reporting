"use client";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ComparisonSeries } from "@/features/page-speed-insights/shared/comparisonChartData";
import {
  CHART_SERIES_COLORS,
  barEndRadius,
  buildKeyedChartConfig,
  horizontalBarChartClassName,
  horizontalBarChartHeight,
  mutedBarCursor,
  yAxisWidthForLabels,
} from "@/features/page-speed-insights/shared/horizontalBarChart";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

type ReportComparisonBarChartProps = {
  data: Array<Record<string, string | number | undefined>>;
  categoryKey?: string;
  series: ComparisonSeries[];
  formatValue: (value: number) => string;
  tickFormatter?: (value: string) => string;
  yAxis?: { min?: number; max?: number };
  minHeight?: number;
  showValueAxis?: boolean;
};

export function ReportComparisonBarChart({
  data,
  categoryKey = "category",
  series,
  formatValue,
  tickFormatter,
  yAxis,
  minHeight = 160,
  showValueAxis,
}: ReportComparisonBarChartProps) {
  if (!data.length || !series.length) {
    return null;
  }

  const showLegend = series.length > 1;
  const axisVisible = showValueAxis ?? showLegend;
  const config = buildKeyedChartConfig(series);
  const chartHeight = horizontalBarChartHeight(data.length, {
    rowPx: showLegend ? Math.min(64, 20 + series.length * 14) : 40,
    chromePx: 56,
    minPx: minHeight,
    legend: showLegend,
  });
  const yAxisWidth = yAxisWidthForLabels(
    data.map((row) => {
      const raw = String(row[categoryKey] ?? "");
      return tickFormatter ? tickFormatter(raw) : raw;
    }),
    { min: yAxis?.min ?? 72, max: yAxis?.max ?? 160 },
  );
  const labelByKey = new Map(series.map((entry) => [entry.key, entry.label]));

  return (
    <ChartContainer
      config={config}
      className={horizontalBarChartClassName}
      style={{ height: `${chartHeight}px` }}
    >
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ left: 8, right: showLegend ? 16 : 56, top: 4, bottom: 4 }}
        barCategoryGap={showLegend ? "18%" : "24%"}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          hide={!axisVisible}
          tickFormatter={(value) => formatValue(Number(value))}
        />
        <YAxis
          type="category"
          dataKey={categoryKey}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          width={yAxisWidth}
          interval={0}
          tick={{ fontSize: 12 }}
          tickFormatter={tickFormatter ? (value) => tickFormatter(String(value)) : undefined}
        />
        <ChartTooltip
          cursor={mutedBarCursor}
          content={
            <ChartTooltipContent
              indicator="dot"
              formatter={(value, name) => {
                const numeric = typeof value === "number" ? value : Number(value);
                const seriesLabel = labelByKey.get(String(name)) ?? String(name);
                return (
                  <span className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground">{seriesLabel}</span>
                    <span className="font-mono font-medium tabular-nums">
                      {formatValue(numeric)}
                    </span>
                  </span>
                );
              }}
            />
          }
        />
        {showLegend ? (
          <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-2" />} />
        ) : null}
        {series.map((entry, index) => (
          <Bar
            key={entry.key}
            dataKey={entry.key}
            name={entry.key}
            fill={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]}
            radius={barEndRadius}
            barSize={showLegend ? 11 : 18}
            maxBarSize={22}
            isAnimationActive={false}
          >
            {!showLegend ? (
              <LabelList
                dataKey={entry.key}
                position="right"
                className="fill-muted-foreground font-mono text-[10px] tabular-nums"
                formatter={(value) =>
                  typeof value === "number" && value > 0 ? formatValue(value) : ""
                }
              />
            ) : null}
          </Bar>
        ))}
      </BarChart>
    </ChartContainer>
  );
}
