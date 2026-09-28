"use client";

import type { TableItem } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { buildGroupedComparison } from "@/features/page-speed-insights/shared/comparisonChartData";
import { formatAxisMs } from "@/features/page-speed-insights/shared/horizontalBarChart";
import { ReportComparisonBarChart } from "@/features/page-speed-insights/shared/ReportComparisonBarChart";

type MainThreadWorkData = {
  label: string;
  mainThreadWork: TableItem[];
};

const TOP_CATEGORIES = 8;

function categoryName(item: TableItem): string {
  const group = typeof item.group === "string" ? item.group : "";
  const groupLabel = typeof item.groupLabel === "string" ? item.groupLabel : "";
  return groupLabel || toTitleCase(group) || "Other";
}

export function MainThreadWorkChartCard({ metrics }: { metrics: MainThreadWorkData[] }) {
  const { series, rows } = buildGroupedComparison(
    metrics.flatMap(({ label, mainThreadWork }) =>
      mainThreadWork.map((item) => ({
        label,
        category: categoryName(item),
        value: getNumber(item.duration) ?? 0,
      })),
    ),
    { limit: TOP_CATEGORIES },
  );

  if (!rows.length) {
    return null;
  }

  const comparing = series.length > 1;

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader className="pb-3">
        <CardTitle>Main Thread Work by Category</CardTitle>
        <p className="text-sm text-muted-foreground">
          {comparing
            ? "Main-thread time by category for each report."
            : "Where the main thread spent time during the lab run."}
        </p>
      </CardHeader>
      <CardContent>
        <ReportComparisonBarChart
          data={rows}
          series={series}
          formatValue={formatAxisMs}
          yAxis={{ min: 100, max: 160 }}
          showValueAxis
        />
      </CardContent>
    </Card>
  );
}
