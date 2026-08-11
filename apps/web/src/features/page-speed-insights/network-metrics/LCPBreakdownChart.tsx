"use client";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { renderTimeValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import {
  buildKeyedChartConfig,
  formatAxisMs,
  horizontalBarChartClassName,
  mutedBarCursor,
  stackBarRadius,
  yAxisWidthForLabels,
} from "@/features/page-speed-insights/shared/horizontalBarChart";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

type Props = {
  chartHeight: number;
  chartData: Array<Record<string, string | number>>;
  allSubparts: string[];
  subpartLabelBySubpart: Record<string, string>;
};

export function LCPBreakdownChart({
  chartHeight,
  chartData,
  allSubparts,
  subpartLabelBySubpart,
}: Props) {
  const config = buildKeyedChartConfig(
    allSubparts.map((subpart) => ({
      key: subpart,
      label: subpartLabelBySubpart[subpart] ?? subpart,
    })),
  );
  const yAxisWidth = yAxisWidthForLabels(
    chartData.map((row) => String(row.report ?? "")),
    { min: 72, max: 140 },
  );
  const lastSubpart = allSubparts[allSubparts.length - 1];

  return (
    <ChartContainer
      config={config}
      className={horizontalBarChartClassName}
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
          cursor={mutedBarCursor}
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
        {allSubparts.map((subpart, index) => (
          <Bar
            key={subpart}
            dataKey={subpart}
            name={subpart}
            stackId="lcp"
            fill={`var(--color-${subpart})`}
            stroke="hsl(var(--background))"
            strokeWidth={allSubparts.length > 1 ? 1 : 0}
            radius={stackBarRadius(index, allSubparts.length)}
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
        ))}
      </BarChart>
    </ChartContainer>
  );
}
