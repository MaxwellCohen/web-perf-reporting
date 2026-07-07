"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { chartConfig } from "@/components/common/ChartSettings";
import { RenderBytesValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { renderTimeValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type RecommendationsSummaryProps = {
  recommendations: Recommendation[];
};

function formatSavings(rec: Recommendation): string {
  const { savings, unit } = rec.impact;
  if (!savings) return "";
  if (unit === "ms" || unit === "millisecond") return renderTimeValue(savings);
  if (unit === "byte" || unit === "bytes") return String(savings);
  return `${savings}${unit ? ` ${unit}` : ""}`;
}

export function RecommendationsSummary({ recommendations }: RecommendationsSummaryProps) {
  const summary = useMemo(() => {
    const byPriority = { high: 0, medium: 0, low: 0 };
    let totalMsSavings = 0;
    let totalByteSavings = 0;

    for (const rec of recommendations) {
      byPriority[rec.priority]++;
      const savings = rec.impact.savings ?? 0;
      const unit = rec.impact.unit?.toLowerCase() ?? "";
      if (unit.includes("ms") || unit.includes("millisecond")) {
        totalMsSavings += savings;
      } else if (unit.includes("byte")) {
        totalByteSavings += savings;
      }
    }

    return {
      total: recommendations.length,
      byPriority,
      totalMsSavings,
      totalByteSavings,
    };
  }, [recommendations]);

  const categoryChartData = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const rec of recommendations) {
      const savings = rec.impact.savings ?? 0;
      if (savings <= 0) continue;
      byCategory.set(rec.category, (byCategory.get(rec.category) ?? 0) + savings);
    }
    return Array.from(byCategory.entries())
      .map(([category, savings]) => ({ category, savings }))
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 10);
  }, [recommendations]);

  if (!recommendations.length) {
    return null;
  }

  const chartHeight = Math.max(160, categoryChartData.length * 32 + 48);

  return (
    <div className="mb-6 space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <SummaryStatCard label="Total Issues" value={String(summary.total)} />
        <SummaryStatCard label="High Priority" value={String(summary.byPriority.high)} />
        <SummaryStatCard label="Medium Priority" value={String(summary.byPriority.medium)} />
        <SummaryStatCard label="Low Priority" value={String(summary.byPriority.low)} />
        <SummaryStatCard
          label="Potential Savings"
          value={
            <>
              {summary.totalMsSavings > 0 ? (
                <span>{renderTimeValue(summary.totalMsSavings)}</span>
              ) : null}
              {summary.totalMsSavings > 0 && summary.totalByteSavings > 0 ? (
                <span className="text-muted-foreground"> + </span>
              ) : null}
              {summary.totalByteSavings > 0 ? (
                <RenderBytesValue value={summary.totalByteSavings} />
              ) : null}
              {summary.totalMsSavings === 0 && summary.totalByteSavings === 0 ? (
                <span className="text-muted-foreground">N/A</span>
              ) : null}
            </>
          }
        />
      </div>

      {categoryChartData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Potential Savings by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfig}
              className="w-full"
              style={{ height: `${chartHeight}px` }}
            >
              <BarChart
                accessibilityLayer
                data={categoryChartData}
                layout="vertical"
                margin={{ left: 120, right: 12, top: 12, bottom: 12 }}
                barCategoryGap={8}
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} hide />
                <YAxis
                  type="category"
                  dataKey="category"
                  tickLine={false}
                  axisLine={false}
                  width={120}
                  interval={0}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value, _name, item) => {
                        const rec = item?.payload as { category: string; savings: number };
                        return [`${rec?.savings ?? value}`, "Savings"];
                      }}
                    />
                  }
                />
                <Bar
                  dataKey="savings"
                  fill="hsl(var(--chart-1))"
                  radius={[0, 4, 4, 0]}
                  barSize={14}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SummaryStatCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </Card>
  );
}

export function getQuickWinRecommendations(
  recommendations: Recommendation[],
  limit = 5,
): Recommendation[] {
  return recommendations
    .filter((rec) => rec.priority === "high" && (rec.impact.savings ?? 0) > 0)
    .sort((a, b) => (b.impact.savings ?? 0) - (a.impact.savings ?? 0))
    .slice(0, limit);
}

export { formatSavings };
