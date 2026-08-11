"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { renderTimeValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { useNetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";
import type { TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
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
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

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

export function OriginLatencyChartCard({ mode }: { mode: "rtt" | "latency" }) {
  const series = useNetworkMetricSeries();

  const chartData =
    mode === "rtt"
      ? topOriginsFromSeries(series, "networkRTT", "rtt")
      : topOriginsFromSeries(series, "serverLatency", "serverResponseTime");

  if (!chartData.length) {
    return null;
  }

  const dataKey = mode === "rtt" ? "rtt" : "latency";
  const metricLabel = mode === "rtt" ? "RTT" : "Latency";
  const title = mode === "rtt" ? "Top Origins by RTT" : "Top Origins by Server Latency";
  const description =
    mode === "rtt"
      ? "Highest observed round-trip time by origin."
      : "Highest observed server response time by origin.";
  const config = buildKeyedChartConfig([{ key: dataKey, label: metricLabel }]);
  const chartHeight = horizontalBarChartHeight(chartData.length, { rowPx: 36, minPx: 160 });
  const yAxisWidth = yAxisWidthForLabels(
    chartData.map((row) => row.origin),
    { min: 96, max: 140 },
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
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
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatAxisMs}
            />
            <YAxis
              type="category"
              dataKey="origin"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              width={yAxisWidth}
              interval={0}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => truncateLabel(String(value), 22)}
            />
            <ChartTooltip
              cursor={mutedBarCursor}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value) => [`${renderTimeValue(value)}`, metricLabel]}
                />
              }
            />
            <Bar
              dataKey={dataKey}
              name={dataKey}
              fill={`var(--color-${dataKey})`}
              radius={barEndRadius}
              barSize={16}
              maxBarSize={20}
            >
              <LabelList
                dataKey={dataKey}
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
