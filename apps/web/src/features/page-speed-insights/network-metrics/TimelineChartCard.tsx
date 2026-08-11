"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { renderTimeValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { useNetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";
import { buildTimelineChartRows } from "@/features/page-speed-insights/network-metrics/timelineMetricsData";
import {
  CHART_SERIES_COLORS,
  barEndRadius,
  buildKeyedChartConfig,
  formatAxisMs,
  horizontalBarChartClassName,
  horizontalBarChartHeight,
  mutedBarCursor,
  yAxisWidthForLabels,
} from "@/features/page-speed-insights/shared/horizontalBarChart";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

export function TimelineChartCard() {
  const series = useNetworkMetricSeries();

  const chartData = buildTimelineChartRows(series);
  const reportLabels = series.map((m) => m.label);

  if (!series.length || chartData.length === 0) {
    return null;
  }

  const showLegend = reportLabels.length > 1;
  const config = buildKeyedChartConfig(
    reportLabels.map((label, index) => ({
      key: label || `report-${index}`,
      label: label || `Report ${index + 1}`,
    })),
  );
  const chartHeight = horizontalBarChartHeight(chartData.length, {
    rowPx: showLegend ? 40 : 44,
    chromePx: 64,
    minPx: 200,
    legend: showLegend,
  });
  const yAxisWidth = yAxisWidthForLabels(
    chartData.map((row) => String(row.event ?? "")),
    { min: 100, max: 160 },
  );
  const singleReportKey = reportLabels[0] || "report-0";

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader className="pb-3">
        <CardTitle>Page Load Timeline</CardTitle>
        <p className="text-sm text-muted-foreground">
          Key navigation and paint timings compared across reports.
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={config}
          className={horizontalBarChartClassName}
          style={{ height: `${chartHeight}px` }}
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 8, right: showLegend ? 16 : 48, top: 4, bottom: 4 }}
            barCategoryGap="22%"
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatAxisMs}
            />
            <YAxis
              type="category"
              dataKey="event"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              width={yAxisWidth}
              interval={0}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              cursor={mutedBarCursor}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value) => [`${renderTimeValue(value)}`, "Time"]}
                />
              }
            />
            {showLegend ? (
              <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-2" />} />
            ) : null}
            {reportLabels.map((label, index) => {
              const key = label || `report-${index}`;
              return (
                <Bar
                  key={key}
                  dataKey={key}
                  name={key}
                  fill={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]}
                  radius={barEndRadius}
                  barSize={showLegend ? 12 : 20}
                  maxBarSize={24}
                >
                  {!showLegend && key === singleReportKey ? (
                    <LabelList
                      dataKey={key}
                      position="right"
                      className="fill-muted-foreground font-mono text-[10px] tabular-nums"
                      formatter={(value) =>
                        typeof value === "number" && value > 0 ? formatAxisMs(value) : ""
                      }
                    />
                  ) : null}
                </Bar>
              );
            })}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
