"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatBytes } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { useNetworkRequestStats } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";
import type { TableItem } from "@/lib/schema";
import {
  barEndRadius,
  buildKeyedChartConfig,
  horizontalBarChartClassName,
  horizontalBarChartHeight,
  mutedBarCursor,
  yAxisWidthForLabels,
} from "@/features/page-speed-insights/shared/horizontalBarChart";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

function sumOn<T extends Record<string, unknown>>(items: T[], key: string): number {
  return items.reduce((acc, curr) => {
    const value = curr[key];
    return acc + (typeof value === "number" ? value : 0);
  }, 0);
}

export function ResourceTypeChartCard() {
  const requestStats = useNetworkRequestStats();

  const chartData = useMemo(() => {
    const validStats = requestStats.filter(
      (s) => s.byResourceType && Object.keys(s.byResourceType).length > 0,
    );
    if (!validStats.length) return [];

    if (validStats.length === 1) {
      const { byResourceType } = validStats[0];
      return Object.entries(byResourceType)
        .map(([type, items]) => {
          const typedItems = Array.isArray(items) ? (items as TableItem[]) : [];
          return {
            resourceType: toTitleCase(type),
            transferSize: sumOn(typedItems, "transferSize"),
          };
        })
        .sort((a, b) => b.transferSize - a.transferSize);
    }

    const typeTotals = new Map<string, number>();
    for (const { byResourceType } of validStats) {
      for (const [type, items] of Object.entries(byResourceType)) {
        const typedItems = Array.isArray(items) ? (items as TableItem[]) : [];
        const size = sumOn(typedItems, "transferSize");
        typeTotals.set(type, (typeTotals.get(type) ?? 0) + size);
      }
    }

    return Array.from(typeTotals.entries())
      .map(([type, transferSize]) => ({
        resourceType: toTitleCase(type),
        transferSize,
      }))
      .sort((a, b) => b.transferSize - a.transferSize);
  }, [requestStats]);

  if (!chartData.length) {
    return null;
  }

  const config = buildKeyedChartConfig([
    { key: "transferSize", label: "Transfer size" },
  ]);
  const chartHeight = horizontalBarChartHeight(chartData.length, { rowPx: 40, minPx: 180 });
  const yAxisWidth = yAxisWidthForLabels(
    chartData.map((row) => row.resourceType),
    { min: 88, max: 140 },
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Resource Type Transfer Size</CardTitle>
        <p className="text-sm text-muted-foreground">
          Bytes transferred by resource type across the selected reports.
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
            barCategoryGap="24%"
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} hide />
            <YAxis
              type="category"
              dataKey="resourceType"
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
                  formatter={(value) => [formatBytes(value), "Transfer"]}
                />
              }
            />
            <Bar
              dataKey="transferSize"
              name="transferSize"
              fill="var(--color-transferSize)"
              radius={barEndRadius}
              barSize={18}
              maxBarSize={22}
            >
              <LabelList
                dataKey="transferSize"
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
