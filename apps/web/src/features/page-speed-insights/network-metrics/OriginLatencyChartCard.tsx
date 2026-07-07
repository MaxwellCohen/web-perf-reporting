"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { chartConfig } from "@/components/common/ChartSettings";
import { renderTimeValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { useNetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";
import type { TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const TOP_ORIGINS = 8;

type OriginRow = {
  origin: string;
  rtt?: number;
  latency?: number;
};

function topOriginsFromSeries(
  series: ReturnType<typeof useNetworkMetricSeries>,
  itemsField: "networkRTT" | "serverLatency",
  msField: "rtt" | "serverResponseTime",
): OriginRow[] {
  const originMax = new Map<string, number>();

  for (const metric of series) {
    for (const item of metric[itemsField] as TableItem[]) {
      const origin =
        (typeof item.origin === "string" ? item.origin : "").replace(/^https?:\/\//, "") ||
        "Unknown";
      const ms = msField === "rtt" ? getNumber(item.rtt) : getNumber(item.serverResponseTime);
      if (ms === undefined) continue;
      originMax.set(origin, Math.max(originMax.get(origin) ?? 0, ms));
    }
  }

  return Array.from(originMax.entries())
    .map(([origin, ms]) => ({
      origin,
      ...(msField === "rtt" ? { rtt: ms } : { latency: ms }),
    }))
    .sort((a, b) => {
      const aVal = ("rtt" in a ? a.rtt : a.latency) ?? 0;
      const bVal = ("rtt" in b ? b.rtt : b.latency) ?? 0;
      return bVal - aVal;
    })
    .slice(0, TOP_ORIGINS);
}

export function OriginLatencyChartCard({
  mode,
}: {
  mode: "rtt" | "latency";
}) {
  const series = useNetworkMetricSeries();

  const chartData = useMemo(() => {
    if (mode === "rtt") {
      return topOriginsFromSeries(series, "networkRTT", "rtt");
    }
    return topOriginsFromSeries(series, "serverLatency", "serverResponseTime");
  }, [series, mode]);

  if (!chartData.length) {
    return null;
  }

  const dataKey = mode === "rtt" ? "rtt" : "latency";
  const title = mode === "rtt" ? "Top Origins by RTT" : "Top Origins by Server Latency";
  const chartHeight = Math.max(160, chartData.length * 28 + 48);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
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
            margin={{ left: 120, right: 12, top: 12, bottom: 12 }}
            barCategoryGap={8}
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
              dataKey="origin"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={120}
              interval={0}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => [`${renderTimeValue(value)}`, mode === "rtt" ? "RTT" : "Latency"]}
                />
              }
            />
            <Bar
              dataKey={dataKey}
              fill="hsl(var(--chart-1))"
              radius={[0, 4, 4, 0]}
              barSize={12}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
