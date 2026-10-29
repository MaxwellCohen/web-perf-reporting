"use client";

import { LCPBreakdownChart } from "@/features/page-speed-insights/network-metrics/LCPBreakdownChart";
import { buildLcpBreakdownTableFromDetailRows } from "@/features/page-speed-insights/network-metrics/lcpBreakdownSelectors";
import { horizontalBarChartHeight } from "@/features/page-speed-insights/shared/horizontalBarChart";
import { itemLabel, itemNumeric } from "./auditItemValues";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  buildKeyedChartConfig,
  formatAxisMs,
  horizontalBarChartClassName,
  mutedBarCursor,
  stackBarRadius,
  yAxisWidthForLabels,
} from "@/features/page-speed-insights/shared/horizontalBarChart";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export function AuditLcpPhaseViz({ rows }: { rows: DetailTableItem[] }) {
  // List-unwrapped LCP rows have table items with subpart/duration on details.items
  // or the original list may still be present — DetailTable special-cases list→table.
  const tableRows = rows.map((row) => {
    const details = row.auditResult?.details as
      | { type?: string; items?: Array<Record<string, unknown>> }
      | undefined;
    // When still a list, pull the embedded table's items
    if (details?.type === "list") {
      const table = (details.items || []).find(
        (item) => item && typeof item === "object" && item.type === "table",
      ) as { items?: Array<Record<string, unknown>> } | undefined;
      return {
        ...row,
        auditResult: {
          ...row.auditResult,
          details: { type: "table" as const, items: table?.items || [] },
        },
      };
    }
    return row;
  });

  const breakdown = buildLcpBreakdownTableFromDetailRows(tableRows as never);
  if (!breakdown) return null;

  const chartData = breakdown.reportLabels.map((report) => {
    const row: Record<string, string | number> = { report };
    let total = 0;
    for (const tableRow of breakdown.tableRows) {
      const value = tableRow.valuesByReportLabel[report] ?? 0;
      row[tableRow.subpart] = value;
      total += value;
    }
    row.total = total;
    return row;
  });
  const allSubparts = breakdown.tableRows.map((row) => row.subpart);
  const subpartLabelBySubpart = Object.fromEntries(
    breakdown.tableRows.map((row) => [row.subpart, row.label]),
  );
  const chartHeight = horizontalBarChartHeight(chartData.length, {
    legend: true,
    rowPx: 30,
    chromePx: 40,
    minPx: 0,
  });

  return (
    <div className="w-full min-w-0 space-y-1">
      <p className="text-xs font-medium text-muted-foreground">LCP phases</p>
      <LCPBreakdownChart
        barSize={14}
        chartHeight={chartHeight}
        chartData={chartData}
        allSubparts={allSubparts}
        subpartLabelBySubpart={subpartLabelBySubpart}
      />
    </div>
  );
}

const INP_PHASE_ORDER = ["inputDelay", "processingDuration", "presentationDelay"];

export function AuditInpPhaseViz({ rows }: { rows: DetailTableItem[] }) {
  const phaseMap = new Map<string, { label: string; values: Record<string, number> }>();

  for (const row of rows) {
    const report = row._userLabel || "Report";
    const items = row.auditResult?.details?.items || [];
    for (const item of items) {
      const subpart =
        typeof item.subpart === "string"
          ? item.subpart
          : typeof item.phase === "string"
            ? item.phase
            : "";
      if (!subpart) continue;
      const duration = itemNumeric(item, ["duration", "value"]) ?? 0;
      if (!phaseMap.has(subpart)) {
        phaseMap.set(subpart, {
          label: typeof item.label === "string" ? item.label : itemLabel(item, ["label", "subpart"]),
          values: {},
        });
      }
      phaseMap.get(subpart)!.values[report] = duration;
    }
  }

  if (!phaseMap.size) return null;

  const phases = [...phaseMap.entries()].sort((a, b) => {
    const ai = INP_PHASE_ORDER.indexOf(a[0]);
    const bi = INP_PHASE_ORDER.indexOf(b[0]);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const reports = [...new Set(rows.map((row) => row._userLabel || "Report"))];
  const chartData = reports.map((report) => {
    const data: Record<string, string | number> = { report };
    for (const [subpart, entry] of phases) {
      data[subpart] = entry.values[report] ?? 0;
    }
    return data;
  });
  const allSubparts = phases.map(([subpart]) => subpart);
  const labels = Object.fromEntries(phases.map(([subpart, entry]) => [subpart, entry.label]));
  const config = buildKeyedChartConfig(
    allSubparts.map((subpart) => ({ key: subpart, label: labels[subpart] ?? subpart })),
  );
  const chartHeight = horizontalBarChartHeight(chartData.length, { legend: true, rowPx: 48 });
  const yAxisWidth = yAxisWidthForLabels(
    chartData.map((row) => String(row.report)),
    { min: 72, max: 140 },
  );
  return (
    <div className="w-full min-w-0 space-y-2">
      <p className="text-sm font-medium text-muted-foreground">INP phases</p>
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
          barCategoryGap="28%"
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
          <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={formatAxisMs} />
          <YAxis
            type="category"
            dataKey="report"
            tickLine={false}
            axisLine={false}
            width={yAxisWidth}
            interval={0}
            tick={{ fontSize: 12 }}
          />
          <ChartTooltip
            cursor={mutedBarCursor}
            content={
              <ChartTooltipContent
                indicator="dot"
                formatter={(value, name) =>
                  `${formatMs(Number(value))} ${labels[String(name)] ?? String(name)}`
                }
              />
            }
          />
          <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-2" />} />
          {allSubparts.map((subpart, index) => (
            <Bar
              key={subpart}
              dataKey={subpart}
              stackId="inp"
              fill={`var(--color-${subpart})`}
              radius={stackBarRadius(index, allSubparts.length)}
              maxBarSize={22}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  );
}
