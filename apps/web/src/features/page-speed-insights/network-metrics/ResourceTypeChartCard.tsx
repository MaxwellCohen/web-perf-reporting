"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { chartConfig } from "@/components/common/ChartSettings";
import { formatBytes } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { useNetworkRequestStats } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";
import type { TableItem } from "@/lib/schema";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

function sumOn<T extends Record<string, unknown>>(items: T[], key: string): number {
  return items.reduce((acc, curr) => {
    const value = curr[key];
    return acc + (typeof value === "number" ? value : 0);
  }, 0);
}

const typeColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

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

  const chartHeight = Math.max(180, chartData.length * 32 + 48);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Type Transfer Size</CardTitle>
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
            margin={{ left: 100, right: 12, top: 12, bottom: 12 }}
            barCategoryGap={8}
          >
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} hide />
            <YAxis
              type="category"
              dataKey="resourceType"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={100}
              interval={0}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => [formatBytes(value), "Transfer"]}
                />
              }
            />
            <Bar
              dataKey="transferSize"
              fill={typeColors[0]}
              radius={[0, 4, 4, 0]}
              barSize={14}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
