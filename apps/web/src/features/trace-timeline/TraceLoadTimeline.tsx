"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Timeline } from "@/features/page-speed-insights/Timeline";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import {
  CHART_SERIES_COLORS,
  barEndRadius,
  horizontalBarChartClassName,
  mutedBarCursor,
} from "@/features/page-speed-insights/shared/horizontalBarChart";
import { UnifiedWaterfall } from "@/features/page-speed-insights/waterfall/UnifiedWaterfall";
import { useMemo } from "react";
import type { ParsedTrace } from "./parseTrace";
import { traceToCombinedLoad } from "./traceToLoad";

const MAX_FRAMES = 12;
const MARKER_NAMES: Record<string, string> = {
  FP: "First Paint",
  FCP: "FCP",
  LCP: "LCP",
  DCL: "DOM Content Loaded",
  Load: "Load",
};

/** Even sample of screenshots so the strip matches the CWV viewer's density. */
function sampleFrames(shots: ParsedTrace["screenshots"]) {
  if (shots.length <= MAX_FRAMES) return shots;
  return Array.from(
    { length: MAX_FRAMES },
    (_, i) => shots[Math.round((i * (shots.length - 1)) / (MAX_FRAMES - 1))],
  );
}

export function TraceLoadTimeline({ trace }: { trace: ParsedTrace }) {
  const load = useMemo(() => traceToCombinedLoad(trace), [trace]);
  const markers = trace.markers.map((m) => ({ label: m.label, timeMs: Math.round(m.time) }));
  const frames = sampleFrames(trace.screenshots).map((s) => ({
    timing: Math.round(s.time),
    timestamp: s.time,
    data: `data:image/jpeg;base64,${s.data}`,
  }));
  const rows = trace.markers
    .map((m) => ({ event: MARKER_NAMES[m.label] ?? m.label, time: Math.round(m.time) }))
    .sort((a, b) => a.time - b.time);

  return (
    <div className="mb-6 space-y-4">
      <Timeline
        device="Trace"
        timeline={{ type: "filmstrip", items: frames, scale: 1 }}
        markers={markers}
      />
      <UnifiedWaterfall load={load} axisEndMs={trace.duration} />
      {rows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Page Load Timeline</CardTitle>
            <p className="text-sm text-muted-foreground">
              Key navigation and paint timings from the trace ({trace.longTasks.length} long tasks ≥
              50 ms).
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ time: { label: "Time", color: CHART_SERIES_COLORS[0] } }}
              className={horizontalBarChartClassName}
              style={{ height: `${rows.length * 44 + 64}px` }}
            >
              <BarChart
                accessibilityLayer
                data={rows}
                layout="vertical"
                margin={{ left: 8, right: 48, top: 4, bottom: 4 }}
                barCategoryGap="22%"
              >
                <CartesianGrid
                  horizontal={false}
                  strokeDasharray="3 3"
                  className="stroke-border/40"
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatMs}
                />
                <YAxis
                  type="category"
                  dataKey="event"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  width={140}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={mutedBarCursor}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      formatter={(v) => [formatMs(Number(v)), "Time"]}
                    />
                  }
                />
                <Bar
                  dataKey="time"
                  fill={CHART_SERIES_COLORS[0]}
                  radius={barEndRadius}
                  barSize={20}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="time"
                    position="right"
                    className="fill-muted-foreground font-mono text-[10px] tabular-nums"
                    formatter={(v: unknown) => (typeof v === "number" && v > 0 ? formatMs(v) : "")}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
