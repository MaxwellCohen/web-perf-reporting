import type { CruxHistoryItem } from "@/lib/schema";
import type { ComponentType } from "react";
import { CruxGaugeChart } from "@/components/latest-crux/charts/CruxGaugeChart";
import { CruxHistogramChart } from "@/components/latest-crux/charts/CruxHistogramChart";
import { CruxRadialChart } from "@/components/latest-crux/charts/CruxRadialChart";
import { PerformanceStackedBarChart } from "@/components/latest-crux/charts/CruxStackedBarChart";

type HistogramChartProps = { histogramData: CruxHistoryItem };

export const ChartMap: Record<string, ComponentType<HistogramChartProps>> = {
  Histogram: CruxHistogramChart,
  "Stacked Bar": PerformanceStackedBarChart,
  "Radial Chart": CruxRadialChart,
  "Gauge Chart": CruxGaugeChart,
};
