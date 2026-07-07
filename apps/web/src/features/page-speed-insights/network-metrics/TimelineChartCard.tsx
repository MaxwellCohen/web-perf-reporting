"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { chartConfig } from "@/components/common/ChartSettings";
import { renderTimeValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { useNetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";
import { buildTimelineChartRows } from "@/features/page-speed-insights/network-metrics/timelineMetricsData";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";

const reportColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function TimelineChartCard() {
  const series = useNetworkMetricSeries();

  const { chartData, reportLabels } = useMemo(() => {
    const rows = buildTimelineChartRows(series);
    const labels = series.map((m) => m.label);
    return { chartData: rows, reportLabels: labels };
  }, [series]);

  if (!series.length || chartData.length === 0) {
    return null;
  }

  const chartHeight = Math.max(200, chartData.length * 36 + 48);

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>Page Load Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="w-full"
          style={{ height: `${chartHeight}px` }}
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 140, right: 12, top: 12, bottom: 12 }}
            barCategoryGap={12}
          >
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}ms`}
            />
            <YAxis
              type="category"
              dataKey="event"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={140}
              interval={0}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => [`${renderTimeValue(value)}`, "Time"]}
                />
              }
            />
            {reportLabels.length > 1 ? <Legend /> : null}
            {reportLabels.map((label, index) => (
              <Bar
                key={label || `report-${index}`}
                dataKey={label}
                name={label}
                fill={reportColors[index % reportColors.length]}
                radius={[0, 4, 4, 0]}
                barSize={reportLabels.length > 1 ? 10 : 16}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
