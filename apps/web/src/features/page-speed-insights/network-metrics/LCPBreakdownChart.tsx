"use client";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { renderTimeValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

type Props = {
  chartHeight: number;
  chartData: Array<Record<string, string | number>>;
  allSubparts: string[];
  subpartLabelBySubpart: Record<string, string>;
};

/** Sequential palette so LCP phases read left→right as a timeline. */
const SUBPART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-5))",
] as const;

function buildChartConfig(
  allSubparts: string[],
  subpartLabelBySubpart: Record<string, string>,
): ChartConfig {
  return Object.fromEntries(
    allSubparts.map((subpart, index) => [
      subpart,
      {
        label: subpartLabelBySubpart[subpart] ?? subpart,
        color: SUBPART_COLORS[index % SUBPART_COLORS.length],
      },
    ]),
  );
}

function formatAxisMs(value: number) {
  if (value >= 1000) {
    const seconds = value / 1000;
    return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)}s`;
  }
  return `${Math.round(value)}ms`;
}

export function LCPBreakdownChart({
  chartHeight,
  chartData,
  allSubparts,
  subpartLabelBySubpart,
}: Props) {
  const config = buildChartConfig(allSubparts, subpartLabelBySubpart);
  const yAxisWidth = Math.min(
    140,
    Math.max(
      72,
      ...chartData.map((row) => String(row.report ?? "").length * 7 + 16),
    ),
  );
  const lastSubpart = allSubparts[allSubparts.length - 1];

  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full justify-start"
      style={{ height: `${chartHeight}px` }}
    >
      <BarChart
        accessibilityLayer
        data={chartData}
        layout="vertical"
        margin={{
          left: 8,
          right: 48,
          top: 4,
          bottom: 4,
        }}
        barCategoryGap="28%"
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
          dataKey="report"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          width={yAxisWidth}
          interval={0}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
          wrapperStyle={{ zIndex: 9999 }}
          content={
            <ChartTooltipContent
              indicator="dot"
              style={{ zIndex: 9999 }}
              formatter={(value, name) => {
                const label = subpartLabelBySubpart[String(name)] ?? String(name);
                return [`${renderTimeValue(value)}`, label];
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-2" />} />
        {allSubparts.map((subpart, index) => {
          const isFirst = index === 0;
          const isLast = index === allSubparts.length - 1;
          return (
            <Bar
              key={subpart}
              dataKey={subpart}
              name={subpart}
              stackId="lcp"
              fill={`var(--color-${subpart})`}
              stroke="hsl(var(--background))"
              strokeWidth={allSubparts.length > 1 ? 1 : 0}
              radius={
                isFirst && isLast
                  ? [6, 6, 6, 6]
                  : isFirst
                    ? [6, 0, 0, 6]
                    : isLast
                      ? [0, 6, 6, 0]
                      : 0
              }
              barSize={22}
              maxBarSize={28}
            >
              {subpart === lastSubpart ? (
                <LabelList
                  dataKey="total"
                  position="right"
                  className="fill-muted-foreground font-mono text-[10px] tabular-nums"
                  formatter={(value) =>
                    typeof value === "number" && value > 0 ? formatAxisMs(value) : ""
                  }
                />
              ) : null}
            </Bar>
          );
        })}
      </BarChart>
    </ChartContainer>
  );
}
