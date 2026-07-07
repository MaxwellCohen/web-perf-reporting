"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { chartConfig } from "@/components/common/ChartSettings";
import { formatBytes } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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

  const chartHeight = Math.max(160, chartData.length * 40 + 48);

  return (
    <Card>
      <CardHeader>
        <CardTitle>JavaScript by Report</CardTitle>
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
            margin={{ left: 80, right: 12, top: 12, bottom: 12 }}
            barCategoryGap={12}
          >
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} hide />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={80}
              interval={0}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
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
              fill="hsl(var(--chart-1))"
              radius={[0, 4, 4, 0]}
              barSize={14}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
