"use client";

import { useMemo } from "react";
import type { TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { chartConfig } from "@/components/common/ChartSettings";
import { renderTimeValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type MainThreadWorkData = {
  label: string;
  mainThreadWork: TableItem[];
};

const TOP_CATEGORIES = 8;

export function MainThreadWorkChartCard({ metrics }: { metrics: MainThreadWorkData[] }) {
  const chartData = useMemo(() => {
    const categoryTotals = new Map<string, number>();

    for (const { mainThreadWork } of metrics) {
      for (const item of mainThreadWork) {
        const group = typeof item.group === "string" ? item.group : "";
        const groupLabel =
          typeof item.groupLabel === "string" ? item.groupLabel : group || "Other";
        const label = groupLabel || toTitleCase(group) || "Other";
        const duration = getNumber(item.duration) ?? 0;
        categoryTotals.set(label, (categoryTotals.get(label) ?? 0) + duration);
      }
    }

    return Array.from(categoryTotals.entries())
      .map(([category, duration]) => ({ category, duration }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, TOP_CATEGORIES);
  }, [metrics]);

  const hasData = metrics.some((m) => m.mainThreadWork.length > 0);
  if (!hasData || !chartData.length) {
    return null;
  }

  const chartHeight = Math.max(180, chartData.length * 32 + 48);

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>Main Thread Work by Category</CardTitle>
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
            barCategoryGap={8}
          >
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}ms`}
            />
            <YAxis
              type="category"
              dataKey="category"
              tickLine={false}
              axisLine={false}
              width={140}
              interval={0}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => [`${renderTimeValue(value)}`, "Time Spent"]}
                />
              }
            />
            <Bar
              dataKey="duration"
              fill="hsl(var(--chart-2))"
              radius={[0, 4, 4, 0]}
              barSize={14}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
