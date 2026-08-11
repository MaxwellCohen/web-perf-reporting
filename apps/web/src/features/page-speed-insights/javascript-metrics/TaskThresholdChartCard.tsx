"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  computeTaskSummaryStats,
  type TaskSummaryData,
} from "@/features/page-speed-insights/javascript-metrics/taskSummaryStats";
import {
  buildKeyedChartConfig,
  horizontalBarChartClassName,
  horizontalBarChartHeight,
  mutedBarCursor,
  stackBarRadius,
  yAxisWidthForLabels,
} from "@/features/page-speed-insights/shared/horizontalBarChart";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

const THRESHOLDS = [
  { key: "numTasksOver10ms", label: ">10ms" },
  { key: "numTasksOver25ms", label: ">25ms" },
  { key: "numTasksOver50ms", label: ">50ms" },
  { key: "numTasksOver100ms", label: ">100ms" },
  { key: "numTasksOver500ms", label: ">500ms" },
] as const;

type SingleThresholdRow = {
  threshold: (typeof THRESHOLDS)[number]["label"];
  count: number;
};

type MultiThresholdRow = {
  label: string;
} & Record<(typeof THRESHOLDS)[number]["key"], number>;

export function TaskThresholdChartCard({ metrics }: { metrics: TaskSummaryData[] }) {
  const validStats = useMemo(
    () => computeTaskSummaryStats(metrics).filter((s) => s.totalTasks > 0),
    [metrics],
  );
  const isSingleReport = validStats.length === 1;

  const singleChartData = useMemo((): SingleThresholdRow[] | null => {
    if (!isSingleReport) {
      return null;
    }
    const stat = validStats[0];
    return THRESHOLDS.map(({ key, label }) => ({
      threshold: label,
      count: stat[key],
    }));
  }, [isSingleReport, validStats]);

  const multiChartData = useMemo((): MultiThresholdRow[] | null => {
    if (isSingleReport) {
      return null;
    }
    return validStats.map((stat) => ({
      label: stat.label || "Unknown",
      ...THRESHOLDS.reduce(
        (acc, { key }) => {
          acc[key] = stat[key];
          return acc;
        },
        {} as Record<(typeof THRESHOLDS)[number]["key"], number>,
      ),
    }));
  }, [isSingleReport, validStats]);

  if (!validStats.length) {
    return null;
  }

  const config = buildKeyedChartConfig([
    { key: "count", label: "Tasks" },
    ...THRESHOLDS.map(({ key, label }) => ({ key, label })),
  ]);
  const chartHeight = isSingleReport
    ? 240
    : horizontalBarChartHeight(validStats.length, {
        rowPx: 48,
        chromePx: 64,
        minPx: 180,
        legend: true,
      });
  const yAxisWidth = yAxisWidthForLabels(
    (multiChartData ?? []).map((row) => row.label),
    { min: 72, max: 120 },
  );

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader className="pb-3">
        <CardTitle>Task Duration Thresholds</CardTitle>
        <p className="text-sm text-muted-foreground">
          How many long tasks crossed each duration threshold.
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={config}
          className={horizontalBarChartClassName}
          style={{ height: `${chartHeight}px` }}
        >
          {isSingleReport && singleChartData ? (
            <BarChart
              accessibilityLayer
              data={singleChartData}
              margin={{ left: 12, right: 16, top: 12, bottom: 8 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="threshold" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
              <ChartTooltip cursor={mutedBarCursor} content={<ChartTooltipContent indicator="dot" />} />
              <Bar
                dataKey="count"
                name="count"
                fill="var(--color-count)"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              >
                <LabelList
                  dataKey="count"
                  position="top"
                  className="fill-muted-foreground font-mono text-[10px] tabular-nums"
                />
              </Bar>
            </BarChart>
          ) : multiChartData ? (
            <BarChart
              accessibilityLayer
              data={multiChartData}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
              barCategoryGap="24%"
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
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
              <ChartTooltip cursor={mutedBarCursor} content={<ChartTooltipContent indicator="dot" />} />
              <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-2" />} />
              {THRESHOLDS.map(({ key }, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={key}
                  fill={`var(--color-${key})`}
                  stackId="tasks"
                  stroke="hsl(var(--background))"
                  strokeWidth={1}
                  radius={stackBarRadius(index, THRESHOLDS.length)}
                  barSize={18}
                  maxBarSize={22}
                />
              ))}
            </BarChart>
          ) : null}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
