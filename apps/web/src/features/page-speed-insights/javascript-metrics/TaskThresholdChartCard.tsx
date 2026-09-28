"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  computeTaskSummaryStats,
  type TaskSummaryData,
} from "@/features/page-speed-insights/javascript-metrics/taskSummaryStats";
import { buildGroupedComparison } from "@/features/page-speed-insights/shared/comparisonChartData";
import {
  buildKeyedChartConfig,
  horizontalBarChartClassName,
  mutedBarCursor,
} from "@/features/page-speed-insights/shared/horizontalBarChart";
import { ReportComparisonBarChart } from "@/features/page-speed-insights/shared/ReportComparisonBarChart";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

const THRESHOLDS = [
  { key: "numTasksOver10ms", label: ">10ms" },
  { key: "numTasksOver25ms", label: ">25ms" },
  { key: "numTasksOver50ms", label: ">50ms" },
  { key: "numTasksOver100ms", label: ">100ms" },
  { key: "numTasksOver500ms", label: ">500ms" },
] as const;

function formatCount(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value)) : "";
}

export function TaskThresholdChartCard({ metrics }: { metrics: TaskSummaryData[] }) {
  const validStats = computeTaskSummaryStats(metrics).filter((stat) => stat.totalTasks > 0);
  if (!validStats.length) {
    return null;
  }

  if (validStats.length === 1) {
    return <SingleReportThresholdChart stat={validStats[0]} />;
  }

  return <ComparisonThresholdChart stats={validStats} />;
}

function SingleReportThresholdChart({
  stat,
}: {
  stat: ReturnType<typeof computeTaskSummaryStats>[number];
}) {
  const chartData = THRESHOLDS.map(({ key, label }) => ({
    threshold: label,
    count: stat[key],
  }));
  const config = buildKeyedChartConfig([{ key: "count", label: "Tasks" }]);

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
          style={{ height: "240px" }}
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 12, right: 16, top: 12, bottom: 8 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis dataKey="threshold" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
            <ChartTooltip
              cursor={mutedBarCursor}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar
              dataKey="count"
              name="count"
              fill="var(--color-count)"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="count"
                position="top"
                className="fill-muted-foreground font-mono text-[10px] tabular-nums"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function ComparisonThresholdChart({
  stats,
}: {
  stats: ReturnType<typeof computeTaskSummaryStats>;
}) {
  const { series, rows } = buildGroupedComparison(
    stats.flatMap((stat) =>
      THRESHOLDS.map(({ key, label }) => ({
        label: stat.label || "Unknown",
        category: label,
        value: stat[key],
      })),
    ),
    { order: "listed-top-first" },
  );

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader className="pb-3">
        <CardTitle>Task Duration Thresholds</CardTitle>
        <p className="text-sm text-muted-foreground">
          Long-task counts at each threshold, for each report.
        </p>
      </CardHeader>
      <CardContent>
        <ReportComparisonBarChart
          data={rows}
          series={series}
          formatValue={formatCount}
          minHeight={220}
          showValueAxis
        />
      </CardContent>
    </Card>
  );
}
