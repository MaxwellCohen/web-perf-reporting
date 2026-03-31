"use client";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { chartConfig } from "@/components/common/ChartSettings";
import { renderTimeValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";

type Props = {
  chartHeight: number;
  chartData: Array<Record<string, string | number>>;
  allSubparts: string[];
  subpartLabelBySubpart: Record<string, string>;
};

// Color mapping for subparts
const subpartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function LCPBreakdownChart({
  chartHeight,
  chartData,
  allSubparts,
  subpartLabelBySubpart,
}: Props) {
  return (
    <ChartContainer
      config={chartConfig}
      className="w-full h-full"
      style={{ height: `${chartHeight}px` }}
    >
      <BarChart
        accessibilityLayer
        data={chartData}
        layout="vertical"
        margin={{
          left: 120,
          right: 12,
          top: 12,
          bottom: 12,
        }}
        barCategoryGap={24}
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
          dataKey="report"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={120}
          interval={0}
        />
        <ChartTooltip
          cursor={false}
          wrapperStyle={{ zIndex: 9999 }}
          content={
            <ChartTooltipContent
              indicator="line"
              style={{ zIndex: 9999 }}
              formatter={(value, name) => {
                const label = subpartLabelBySubpart[String(name)] ?? String(name);
                const formattedValue = `${renderTimeValue(value)} `;
                return [formattedValue, label];
              }}
            />
          }
        />
        {allSubparts.map((subpart, index) => (
          <Bar
            key={subpart}
            dataKey={subpart}
            stackId="a"
            fill={subpartColors[index % subpartColors.length]}
            fillOpacity={0.8}
            radius={index === allSubparts.length - 1 ? [0, 4, 4, 0] : 0}
            barSize={16}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

