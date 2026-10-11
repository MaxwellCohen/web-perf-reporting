"use client";

import { RadialBar, RadialBarChart } from "recharts";

import { Card } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { toSentenceCase } from "@/components/common/PercentTable";

export { PercentTable, toSentenceCase } from "@/components/common/PercentTable";

export function FormFactorPercentPieChart({
  title,
  form_factors,
}: {
  title: string;
  form_factors: Record<string, number>;
}) {
  const entries = Object.entries(form_factors);
  const chartData = [
    entries.reduce((acc: Record<string, number>, [key, value]) => {
      acc[key] = value * 100;
      return acc;
    }, {}),
  ];
  const chartConfig = entries.reduce((acc: ChartConfig, [label], i) => {
    acc[label] = {
      label: toSentenceCase(label),
      color: `hsl(var(--chart-${i + 4}))`,
    };
    return acc;
  }, {});

  return (
    <Card className="grid-rows-[44px,auto, 1fr] grid grid-cols-1 gap-3 p-2">
      <div className="text-md text-center font-bold">{title}</div>
      <ChartContainer config={chartConfig} className="w-full">
        <RadialBarChart data={chartData} innerRadius={"50%"} outerRadius={"100%"}>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          {entries.map(([label]) => (
            <RadialBar
              key={label}
              dataKey={label}
              type="natural"
              fill={chartConfig[label].color}
              fillOpacity={0.4}
              stroke={chartConfig[label].color}
              stackId="a"
              animationDuration={0}
            />
          ))}
        </RadialBarChart>
      </ChartContainer>
      <div className="p-2">
        {entries.map(([label, value]) => {
          return (
            <div key={label} className="text-xs leading-none text-muted-foreground">
              {" "}
              <strong>{toSentenceCase(label)}</strong> {(value * 100).toFixed(2)} %{" "}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
