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
  Dot,
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

describe("Dot", () => {
  it("renders green for P75 <= good_max", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <svg>
        <Dot cx={50} cy={50} r={2} payload={{ P75: 900, good_max: 1000, ni_max: 2000 }} />
      </svg>,
    );
    const circle = container.querySelector("circle");
    expect(circle?.getAttribute("fill")).toBe("var(--color-good_density)");
    vi.restoreAllMocks();
  });

  it("renders amber for P75 between good_max and ni_max", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <svg>
        <Dot cx={50} cy={50} r={2} payload={{ P75: 1500, good_max: 1000, ni_max: 2000 }} />
      </svg>,
    );
    const circle = container.querySelector("circle");
    expect(circle?.getAttribute("fill")).toBe("var(--color-ni_density)");
    vi.restoreAllMocks();
  });

  it("renders red for P75 > ni_max", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <svg>
        <Dot cx={50} cy={50} r={2} payload={{ P75: 2500, good_max: 1000, ni_max: 2000 }} />
      </svg>,
    );
    const circle = container.querySelector("circle");
    expect(circle?.getAttribute("fill")).toBe("var(--color-poor_density)");
    vi.restoreAllMocks();
  });
});

describe("HistoricalP75Chart", () => {
  it("renders P75 line chart with chartData", () => {
    const { container } = render(<HistoricalP75Chart chartData={[historyItem] as any} />);
    expect(container.querySelector('[data-testid="composed-chart"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="line-P75"]')).toBeTruthy();
  });
});
