import { ChartConfig } from "@/components/ui/chart";

export const chartConfig = {
  density: {
    label: 'density',
  },
  good: {
    label: `Good`,
    color: "hsl(var(--chart-2))",
  },
  ni: {
    label: `Needs Improvement`,
    color: "hsl(var(--chart-3))",
  },
  poor: {
    label: `Poor`,
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

export type PerformanceChartData = {
  status: string;
  density: number;
  fill: string;
};


export type HistoricalPerformanceChartData = {
    date: string;
    good: number;
    ni: number;
    poor: number;
};