"use client";

import type { TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { renderTimeValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import {
  barEndRadius,
  buildKeyedChartConfig,
  formatAxisMs,
  horizontalBarChartClassName,
  horizontalBarChartHeight,
  mutedBarCursor,
  yAxisWidthForLabels,
} from "@/features/page-speed-insights/shared/horizontalBarChart";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

type MainThreadWorkData = {
  label: string;
  mainThreadWork: TableItem[];
};

const TOP_CATEGORIES = 8;

export function MainThreadWorkChartCard({ metrics }: { metrics: MainThreadWorkData[] }) {
  const categoryTotals = new Map<string, number>();
  for (const { mainThreadWork } of metrics) {
    for (const item of mainThreadWork) {
      const group = typeof item.group === "string" ? item.group : "";
      const groupLabel = typeof item.groupLabel === "string" ? item.groupLabel : group || "Other";
      const label = groupLabel || toTitleCase(group) || "Other";
      const duration = getNumber(item.duration) ?? 0;
      categoryTotals.set(label, (categoryTotals.get(label) ?? 0) + duration);
    }
  }
  const chartData = Array.from(categoryTotals.entries())
    .map(([category, duration]) => ({ category, duration }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, TOP_CATEGORIES);

  const hasData = metrics.some((m) => m.mainThreadWork.length > 0);
  if (!hasData || !chartData.length) {
    return null;
  }

  const config = buildKeyedChartConfig([{ key: "duration", label: "Time spent" }]);
  const chartHeight = horizontalBarChartHeight(chartData.length, { rowPx: 40, minPx: 180 });
  const yAxisWidth = yAxisWidthForLabels(
    chartData.map((row) => row.category),
    { min: 100, max: 160 },
  );

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader className="pb-3">
        <CardTitle>Main Thread Work by Category</CardTitle>
        <p className="text-sm text-muted-foreground">
          Where the main thread spent time during the lab run.
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
            margin={{ left: 8, right: 48, top: 4, bottom: 4 }}
            barCategoryGap="24%"
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={formatAxisMs} />
            <YAxis
              type="category"
              dataKey="category"
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
                  formatter={(value) => [`${renderTimeValue(value)}`, "Time Spent"]}
                />
              }
            />
            <Bar
              dataKey="duration"
              name="duration"
              fill="var(--color-duration)"
              radius={barEndRadius}
              barSize={18}
              maxBarSize={22}
            >
              <LabelList
                dataKey="duration"
                position="right"
                className="fill-muted-foreground font-mono text-[10px] tabular-nums"
                formatter={(value) =>
                  typeof value === "number" && value > 0 ? formatAxisMs(value) : ""
                }
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
