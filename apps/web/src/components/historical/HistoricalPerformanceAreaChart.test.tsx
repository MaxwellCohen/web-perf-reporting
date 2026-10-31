import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("recharts", () => ({
  ComposedChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="composed-chart">{children}</div>
  ),
  Area: ({ dataKey }: { dataKey: string }) => <div data-testid={`area-${dataKey}`}>{dataKey}</div>,
  Line: ({ dataKey }: { dataKey: string }) => <div data-testid={`line-${dataKey}`}>{dataKey}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: ({ tickFormatter }: { tickFormatter?: (v: string) => string }) => (
    <div data-testid="x-axis">{tickFormatter ? tickFormatter("2024-01-31") : ""}</div>
  ),
  YAxis: () => <div data-testid="y-axis" />,
}));

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: () => <div data-testid="chart-tooltip" />,
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content" />,
}));

import {
  HistoricalPerformanceAreaChart,
  HistoricalP75Chart,
} from "@/components/historical/HistoricalPerformanceAreaChart";

const historyItem = {
  end_date: "2024-01-31",
  good_density: 0.5,
  ni_density: 0.3,
  poor_density: 0.2,
  good_max: 1000,
  ni_max: 2000,
  P75: 900,
};

describe("HistoricalPerformanceAreaChart", () => {
  it("renders chart with chartData", () => {
    const { container } = render(
      <HistoricalPerformanceAreaChart chartData={[historyItem] as any} />,
    );
    expect(container.querySelector('[data-testid="composed-chart"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="area-good_density"]')).toBeTruthy();
    expect(container.textContent).toContain("2024-01-31");
  });
});

describe("HistoricalP75Chart", () => {
  it("renders P75 line chart with chartData", () => {
    const { container } = render(<HistoricalP75Chart chartData={[historyItem] as any} />);
    expect(container.querySelector('[data-testid="composed-chart"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="line-P75"]')).toBeTruthy();
  });
});
