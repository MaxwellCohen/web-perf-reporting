"use client";

import { useMemo } from "react";
import type { TableItem } from "@/lib/schema";
import { getNumber, getUrlString } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { chartConfig } from "@/components/common/ChartSettings";
import { renderTimeValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";

type BootupTimeData = {
  label: string;
  bootupTime: TableItem[];
};

const TOP_SCRIPTS = 8;
const URL_PROTOCOL_REGEX = /^https?:\/\//;

const SEGMENTS = [
  { key: "scriptParseCompile", label: "Parse & Compile", color: "hsl(var(--chart-1))" },
  { key: "scripting", label: "Scripting", color: "hsl(var(--chart-2))" },
  { key: "total", label: "Total", color: "hsl(var(--chart-3))" },
] as const;

export function BootupTimeChartCard({ metrics }: { metrics: BootupTimeData[] }) {
  const chartData = useMemo(() => {
    const scriptTotals = new Map<
      string,
      { scriptParseCompile: number; scripting: number; total: number }
    >();

    for (const { bootupTime } of metrics) {
      for (const item of bootupTime) {
        const url = getUrlString(item.url).replace(URL_PROTOCOL_REGEX, "") || "Unknown";
        const scriptParseCompile = getNumber(item.scriptParseCompile) ?? 0;
        const scripting = getNumber(item.scripting) ?? 0;
        const total = getNumber(item.total) ?? scriptParseCompile + scripting;
        const existing = scriptTotals.get(url) ?? {
          scriptParseCompile: 0,
          scripting: 0,
          total: 0,
        };
        scriptTotals.set(url, {
          scriptParseCompile: existing.scriptParseCompile + scriptParseCompile,
          scripting: existing.scripting + scripting,
          total: existing.total + total,
        });
      }
    }

    return Array.from(scriptTotals.entries())
      .map(([url, values]) => ({ url, ...values }))
      .sort((a, b) => b.total - a.total)
      .slice(0, TOP_SCRIPTS);
  }, [metrics]);

  const hasData = metrics.some((m) => m.bootupTime.length > 0);
  if (!hasData || !chartData.length) {
    return null;
  }

  const chartHeight = Math.max(200, chartData.length * 36 + 64);

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>Top Scripts by Bootup Time</CardTitle>
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
            margin={{ left: 160, right: 12, top: 12, bottom: 12 }}
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
              dataKey="url"
              tickLine={false}
              axisLine={false}
              width={160}
              interval={0}
              tickFormatter={(value) =>
                value.length > 24 ? `${String(value).slice(0, 24)}…` : value
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => [`${renderTimeValue(value)}`, ""]}
                />
              }
            />
            <Legend />
            {SEGMENTS.slice(0, 2).map(({ key, label, color }) => (
              <Bar
                key={key}
                dataKey={key}
                name={label}
                fill={color}
                stackId="bootup"
                barSize={12}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
