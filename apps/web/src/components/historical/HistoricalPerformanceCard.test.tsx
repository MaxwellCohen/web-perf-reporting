import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: (fn: () => Promise<{ default?: React.ComponentType }>) => {
    const Component = ({ chartData }: { chartData?: unknown[] }) => (
      <div data-testid="dynamic-chart">Chart: {chartData?.length ?? 0}</div>
    );
    return Component;
  },
}));

vi.mock("@/components/latest-crux/PerformanceCard", () => ({
  CurrentPerformanceChartContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

vi.mock("@/components/historical/HistoricalPerformanceAreaChart", () => ({
  HistoricalP75Chart: ({ chartData }: { chartData: unknown[] }) => (
    <div data-testid="p75-chart">P75: {chartData?.length ?? 0}</div>
  ),
  HistoricalPerformanceAreaChart: ({ chartData }: { chartData: unknown[] }) => (
    <div data-testid="area-chart">Area: {chartData?.length ?? 0}</div>
  ),
}));

vi.mock("@/components/historical/HistoricalPerformanceBarChart", () => ({
  HistoricalPerformanceBarChart: ({ chartData }: { chartData: unknown[] }) => (
    <div data-testid="bar-chart">Bar: {chartData?.length ?? 0}</div>
  ),
}));

import {
  HistoricalPerformanceCard,
  ChartMap,
} from "@/components/historical/HistoricalPerformanceCard";

const historyItem = {
  end_date: "2024-01-31",
  good_density: 0.5,
  ni_density: 0.3,
  poor_density: 0.2,
  good_max: 1000,
  ni_max: 2000,
  P75: 900,
};

describe("HistoricalPerformanceCard", () => {
  it("returns null when histogramData is empty", () => {
    const { container } = render(<HistoricalPerformanceCard title="LCP" histogramData={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when histogramData is null", () => {
    const { container } = render(<HistoricalPerformanceCard title="LCP" histogramData={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when histogramData is undefined", () => {
    const { container } = render(
      <HistoricalPerformanceCard title="LCP" histogramData={undefined} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders with histogramData and displays thresholds", () => {
    const { container } = render(
      <HistoricalPerformanceCard
        title="Largest Contentful Paint (LCP)"
        histogramData={[historyItem] as any}
      />,
    );
    expect(container.textContent).toContain("Largest Contentful Paint (LCP)");
    expect(container.textContent).toContain("Good:");
    expect(container.textContent).toContain("1000");
    expect(container.textContent).toContain("2000");
    expect(container.querySelector('[data-testid="dynamic-chart"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="p75-chart"]')).toBeTruthy();
  });

  it("uses Stacked Bar when context is Stacked Bar", () => {
    vi.doMock("@/components/latest-crux/PerformanceCard", () => ({
      CurrentPerformanceChartContext: {
        Provider: ({ children, value }: { children: React.ReactNode; value: string }) => (
          <div data-chart-type={value}>{children}</div>
        ),
      },
    }));
    const { container } = render(
      <HistoricalPerformanceCard title="LCP" histogramData={[historyItem] as any} />,
    );
    expect(container.textContent).toContain("LCP");
  });

  it("handles histogramData with null density values", () => {
    const { container } = render(
      <HistoricalPerformanceCard
        title="LCP"
        histogramData={
          [
            {
              ...historyItem,
              good_density: undefined,
              ni_density: undefined,
              poor_density: undefined,
            },
          ] as any
        }
      />,
    );
    expect(container.textContent).toContain("LCP");
  });
});

describe("ChartMap", () => {
  it("contains Area and Stacked Bar", () => {
    expect(ChartMap).toHaveProperty("Area");
    expect(ChartMap).toHaveProperty("Stacked Bar");
  });
});
