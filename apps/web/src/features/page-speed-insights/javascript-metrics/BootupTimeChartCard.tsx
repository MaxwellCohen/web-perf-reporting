"use client";

import type { TableItem } from "@/lib/schema";
import { getNumber, getUrlString } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { renderTimeValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { buildGroupedComparison } from "@/features/page-speed-insights/shared/comparisonChartData";
import {
  buildKeyedChartConfig,
  formatAxisMs,
  horizontalBarChartClassName,
  horizontalBarChartHeight,
  mutedBarCursor,
  stackBarRadius,
  truncateLabel,
  yAxisWidthForLabels,
} from "@/features/page-speed-insights/shared/horizontalBarChart";
import { ReportComparisonBarChart } from "@/features/page-speed-insights/shared/ReportComparisonBarChart";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

type BootupTimeData = {
  label: string;
  bootupTime: TableItem[];
};

const TOP_SCRIPTS = 8;
const URL_PROTOCOL_REGEX = /^https?:\/\//;

const SEGMENTS = [
  { key: "scriptParseCompile", label: "Parse & Compile" },
  { key: "scripting", label: "Scripting" },
] as const;

function scriptUrl(item: TableItem): string {
  return getUrlString(item.url).replace(URL_PROTOCOL_REGEX, "") || "Unknown";
}

export function BootupTimeChartCard({ metrics }: { metrics: BootupTimeData[] }) {
  const reportsWithScripts = metrics.filter((metric) => metric.bootupTime.length > 0);
  if (!reportsWithScripts.length) {
    return null;
  }

  if (reportsWithScripts.length > 1) {
    return <BootupComparisonChart metrics={metrics} />;
  }

  return <BootupCompositionChart metric={reportsWithScripts[0]} />;
}

function BootupComparisonChart({ metrics }: { metrics: BootupTimeData[] }) {
  const { series, rows } = buildGroupedComparison(
    metrics.flatMap(({ label, bootupTime }) =>
      bootupTime.map((item) => {
        const scriptParseCompile = getNumber(item.scriptParseCompile) ?? 0;
        const scripting = getNumber(item.scripting) ?? 0;
        return {
          label,
          category: scriptUrl(item),
          value: getNumber(item.total) ?? scriptParseCompile + scripting,
        };
      }),
    ),
    {
      labels: metrics.map((metric) => metric.label),
      limit: TOP_SCRIPTS,
    },
  );

  if (!rows.length) {
    return null;
  }

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader className="pb-3">
        <CardTitle>Top Scripts by Bootup Time</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total bootup time for the heaviest scripts, for each report.
        </p>
      </CardHeader>
      <CardContent>
        <ReportComparisonBarChart
          data={rows}
          series={series}
          formatValue={formatAxisMs}
          tickFormatter={(value) => truncateLabel(value, 24)}
          yAxis={{ min: 120, max: 168 }}
          showValueAxis
        />
      </CardContent>
    </Card>
  );
}

function BootupCompositionChart({ metric }: { metric: BootupTimeData }) {
  const scriptTotals = new Map<
    string,
    { scriptParseCompile: number; scripting: number; total: number }
  >();
  for (const item of metric.bootupTime) {
    const url = scriptUrl(item);
    const scriptParseCompile = getNumber(item.scriptParseCompile) ?? 0;
    const scripting = getNumber(item.scripting) ?? 0;
    const total = getNumber(item.total) ?? scriptParseCompile + scripting;
    const existing = scriptTotals.get(url) ?? { scriptParseCompile: 0, scripting: 0, total: 0 };
    scriptTotals.set(url, {
      scriptParseCompile: existing.scriptParseCompile + scriptParseCompile,
      scripting: existing.scripting + scripting,
      total: existing.total + total,
    });
  }

  const chartData = Array.from(scriptTotals.entries())
    .map(([url, values]) => ({ url, ...values }))
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_SCRIPTS);

  if (!chartData.length) {
    return null;
  }

  const config = buildKeyedChartConfig(SEGMENTS.map(({ key, label }) => ({ key, label })));
  const chartHeight = horizontalBarChartHeight(chartData.length, {
    rowPx: 40,
    chromePx: 64,
    minPx: 200,
    legend: true,
  });
  const yAxisWidth = yAxisWidthForLabels(
    chartData.map((row) => truncateLabel(row.url, 24)),
    { min: 120, max: 168 },
  );
  const lastSegment = SEGMENTS[SEGMENTS.length - 1].key;

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader className="pb-3">
        <CardTitle>Top Scripts by Bootup Time</CardTitle>
        <p className="text-sm text-muted-foreground">
          Parse/compile vs scripting cost for the heaviest scripts.
        </p>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={config}
          className={horizontalBarChartClassName}
          style={{ height: `${chartHeight}px` }}
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{ left: 8, right: 48, top: 4, bottom: 4 }}
            barCategoryGap="22%"
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={formatAxisMs} />
            <YAxis
              type="category"
              dataKey="url"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              width={yAxisWidth}
              interval={0}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => truncateLabel(String(value), 24)}
            />
            <ChartTooltip
              cursor={mutedBarCursor}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value) => [`${renderTimeValue(value)}`, ""]}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-2" />} />
            {SEGMENTS.map(({ key }, index) => (
              <Bar
                key={key}
                dataKey={key}
                name={key}
                fill={`var(--color-${key})`}
                stackId="bootup"
                stroke="hsl(var(--background))"
                strokeWidth={1}
                radius={stackBarRadius(index, SEGMENTS.length)}
                barSize={18}
                maxBarSize={22}
                isAnimationActive={false}
              >
                {key === lastSegment ? (
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
      </CardContent>
    </Card>
  );
}
