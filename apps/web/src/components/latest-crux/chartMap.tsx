"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { CruxHistoryItem } from "@/lib/schema";
import { CruxHistogramChart } from "@/components/latest-crux/charts/CruxHistogramChart";

type HistogramChartProps = { histogramData: CruxHistoryItem };

function ChartFallback() {
  return (
    <div
      className="h-24 animate-pulse rounded-md bg-muted"
      role="status"
      aria-label="Loading chart"
    />
  );
}

const CruxStackedBarChart = dynamic(
  () =>
    import("@/components/latest-crux/charts/CruxStackedBarChart").then(
      (mod) => mod.PerformanceStackedBarChart,
    ),
  { loading: ChartFallback },
);
const CruxRadialChart = dynamic(
  () => import("@/components/latest-crux/charts/CruxRadialChart").then((mod) => mod.CruxRadialChart),
  { loading: ChartFallback },
);
const CruxGaugeChart = dynamic(
  () => import("@/components/latest-crux/charts/CruxGaugeChart").then((mod) => mod.CruxGaugeChart),
  { loading: ChartFallback },
);

export const ChartMap: Record<string, ComponentType<HistogramChartProps>> = {
  Histogram: CruxHistogramChart,
  "Stacked Bar": CruxStackedBarChart,
  "Radial Chart": CruxRadialChart,
  "Gauge Chart": CruxGaugeChart,
};
