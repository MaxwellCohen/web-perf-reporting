"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatBytes } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import {
  barEndRadius,
  buildKeyedChartConfig,
  horizontalBarChartClassName,
  horizontalBarChartHeight,
  mutedBarCursor,
  yAxisWidthForLabels,
} from "@/features/page-speed-insights/shared/horizontalBarChart";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

type JavaScriptSummary = {
  label: string;
  totalScripts: number;
  totalTransferSize: number;
  totalResourceSize: number;
};

export function JavaScriptSummaryChartCard({ stats }: { stats: JavaScriptSummary[] }) {
  const chartData = useMemo(() => {
    return stats
      .filter((s) => s.totalScripts > 0)
      .map((s) => ({
        label: s.label || "Unknown",
        totalScripts: s.totalScripts,
        totalTransferSize: s.totalTransferSize,
      }));
  }, [stats]);

  if (!chartData.length) {
    return null;
  }

  const config = buildKeyedChartConfig([
    { key: "totalTransferSize", label: "Transfer size" },
  ]);
  const chartHeight = horizontalBarChartHeight(chartData.length, { rowPx: 44, minPx: 160 });
  const yAxisWidth = yAxisWidthForLabels(
    chartData.map((row) => row.label),
    { min: 72, max: 120 },
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>JavaScript by Report</CardTitle>
        <p className="text-sm text-muted-foreground">
          Script transfer size for each report in this comparison.
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
            margin={{ left: 8, right: 56, top: 4, bottom: 4 }}
            barCategoryGap="28%"
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} hide />
            <YAxis
              type="category"
              dataKey="label"
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
                  formatter={(value, name) => {
                    if (name === "totalTransferSize") {
                      return [formatBytes(value), "Transfer Size"];
                    }
                    return [`${value}`, "Scripts"];
                  }}
                />
              }
            />
            <Bar
              dataKey="totalTransferSize"
              name="totalTransferSize"
              fill="var(--color-totalTransferSize)"
              radius={barEndRadius}
              barSize={18}
              maxBarSize={22}
            >
              <LabelList
                dataKey="totalTransferSize"
                position="right"
                className="fill-muted-foreground font-mono text-[10px] tabular-nums"
                formatter={(value) =>
                  typeof value === "number" && value > 0 ? formatBytes(value) : ""
                }
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
