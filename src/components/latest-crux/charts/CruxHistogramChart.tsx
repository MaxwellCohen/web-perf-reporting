"use client";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { chartConfig } from "@/components/common/ChartSettings";
import { cruxHistogramBarData } from "@/components/latest-crux/lib/cruxHistogramBarData";
import type { CruxHistoryItem } from "@/lib/schema";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis } from "recharts";

const HISTOGRAM_STATUS_LABELS: Record<string, string> = {
  good: "Good",
  ni: "Needs Improvement",
  poor: "Poor",
};

export function CruxHistogramChart({ histogramData }: { histogramData: CruxHistoryItem }) {
  const chartData = useMemo(() => cruxHistogramBarData(histogramData), [histogramData]);

  return (
    <div>
      <ChartContainer config={chartConfig}>
        <BarChart accessibilityLayer data={chartData}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="status"
            tickLine={false}
            axisLine={false}
            hide={true}
            tickFormatter={(value) => chartConfig[value as keyof typeof chartConfig]?.label || ""}
          />
          <ChartTooltip
            cursor={true}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => HISTOGRAM_STATUS_LABELS[value] || ""}
                formatter={(value, _label, payload) => {
                  return (
                    <div className="flex items-center gap-1">
                      <div
                        className="size-2 rounded-full"
                        style={{ backgroundColor: payload.payload.fill }}
                      />
                      {Math.round((+value || 0) * 100)}%
                    </div>
                  );
                }}
              />
            }
          />
          <Bar
            dataKey="density"
            strokeWidth={2}
            radius={8}
            activeIndex={2}
            activeBar={({ ...props }) => {
              return (
                <Rectangle
                  {...props}
                  fillOpacity={0.8}
                  stroke={props.payload.fill}
                  strokeDasharray={4}
                  strokeDashoffset={4}
                />
              );
            }}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
