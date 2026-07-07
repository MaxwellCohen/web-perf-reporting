"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { chartConfig } from "@/components/common/ChartSettings";
import {
  computeTaskSummaryStats,
  type TaskSummaryData,
} from "@/features/page-speed-insights/javascript-metrics/taskSummaryStats";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";

const THRESHOLDS = [
  { key: "numTasksOver10ms", label: ">10ms", color: "hsl(var(--chart-1))" },
  { key: "numTasksOver25ms", label: ">25ms", color: "hsl(var(--chart-2))" },
  { key: "numTasksOver50ms", label: ">50ms", color: "hsl(var(--chart-3))" },
  { key: "numTasksOver100ms", label: ">100ms", color: "hsl(var(--chart-4))" },
  { key: "numTasksOver500ms", label: ">500ms", color: "hsl(var(--chart-5))" },
] as const;

export function TaskThresholdChartCard({ metrics }: { metrics: TaskSummaryData[] }) {
  const chartData = useMemo(() => {
    const stats = computeTaskSummaryStats(metrics).filter((s) => s.totalTasks > 0);
    if (stats.length === 1) {
      const stat = stats[0];
      return THRESHOLDS.map(({ key, label }) => ({
        threshold: label,
        count: stat[key],
      }));
    }
    return stats.map((stat) => ({
      label: stat.label || "Unknown",
      ...THRESHOLDS.reduce(
        (acc, { key }) => {
          acc[key] = stat[key];
          return acc;
        },
        {} as Record<string, number>,
      ),
    }));
  }, [metrics]);

  const validStats = computeTaskSummaryStats(metrics).filter((s) => s.totalTasks > 0);
  if (!validStats.length) {
    return null;
  }

  const isSingleReport = validStats.length === 1;
  const chartHeight = isSingleReport ? 220 : Math.max(180, validStats.length * 48 + 64);

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>Task Duration Thresholds</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="w-full"
          style={{ height: `${chartHeight}px` }}
        >
          {isSingleReport ? (
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="threshold" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ left: 80, right: 12, top: 12, bottom: 12 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                tickLine={false}
                axisLine={false}
                width={80}
                interval={0}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Legend />
              {THRESHOLDS.map(({ key, label, color }) => (
                <Bar key={key} dataKey={key} name={label} fill={color} stackId="tasks" barSize={12} />
              ))}
            </BarChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
