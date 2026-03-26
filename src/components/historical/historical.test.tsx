import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const formatCruxReportMock = vi.fn();
const groupByMock = vi.fn();
const getHistoricalCruxDataMock = vi.fn();

vi.mock("next/dynamic", () => ({
  default: () => (props: { chartData?: unknown[] }) => (
    <div>Dynamic chart: {props.chartData?.length ?? 0}</div>
  ),
}));

vi.mock("recharts", () => ({
  Area: ({ dataKey }: { dataKey: string }) => <div>Area: {dataKey}</div>,
  Bar: ({ dataKey }: { dataKey: string }) => <div>Bar: {dataKey}</div>,
  CartesianGrid: () => <div>Cartesian grid</div>,
  ComposedChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: ({ dataKey }: { dataKey: string }) => <div>Line: {dataKey}</div>,
  XAxis: () => <div>X axis</div>,
  YAxis: () => <div>Y axis</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ChartTooltip: () => <div>Chart tooltip</div>,
  ChartTooltipContent: () => <div>Tooltip content</div>,
}));

vi.mock("@/components/common/FormFactorPercentPieChart", () => ({
  PercentTable: ({ title, dateRange }: { title: string; dateRange?: string }) => (
    <div>
      {title}
      {dateRange ? ` - ${dateRange}` : ""}
    </div>
  ),
}));

vi.mock("@/lib/utils", () => ({
  formatCruxReport: (...args: unknown[]) => formatCruxReportMock(...args),
  formatDate: (date: { year: number; month: number; day: number }) =>
    `${date.year}-${date.month}-${date.day}`,
  groupBy: (...args: unknown[]) => groupByMock(...args),
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" "),
}));

vi.mock("@/lib/services", () => ({
  getHistoricalCruxData: (...args: unknown[]) => getHistoricalCruxDataMock(...args),
}));

vi.mock("@/components/ui/accordion", () => ({
  Details: ({ children, ...props }: React.HTMLAttributes<HTMLDetailsElement>) => (
    <details open {...props}>
      {children}
    </details>
  ),
}));

vi.mock("@/components/latest-crux/PerformanceOptions", () => ({
  PerformanceOptions: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

import { HistoricalChartsSection } from "@/components/historical/HistoricalChartsSection";
import { HistoricalDashboard } from "@/components/historical/HistoricalDashboard";
import {
  HistoricalPerformanceAreaChart,
  HistoricalP75Chart,
} from "@/components/historical/HistoricalPerformanceAreaChart";
import { HistoricalPerformanceBarChart } from "@/components/historical/HistoricalPerformanceBarChart";
import { HistoricalPerformanceCard } from "@/components/historical/HistoricalPerformanceCard";
import { CurrentPerformanceChartContext } from "@/components/latest-crux/PerformanceCard";

const report = {
  record: {
    collectionPeriod: {
      firstDate: { year: 2024, month: 1, day: 1 },
      lastDate: { year: 2024, month: 1, day: 31 },
    },
    metrics: {
      form_factors: {
        fractions: { desktop: 0.5, phone: 0.3, tablet: 0.2 },
      },
    },
  },
};

const historyItem = {
  end_date: "2024-01-31",
  good_density: 0.5,
  ni_density: 0.3,
  poor_density: 0.2,
  good_max: 1000,
  ni_max: 2000,
  P75: 900,
};

describe("historical components", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    formatCruxReportMock.mockReset();
    groupByMock.mockReset();
    getHistoricalCruxDataMock.mockReset();
  });

  afterEach(() => vi.useRealTimers());

  it("renders the historical area and bar charts", () => {
    const { container } = render(
      <div>
        <HistoricalPerformanceAreaChart chartData={[historyItem] as any} />
        <HistoricalP75Chart chartData={[historyItem] as any} />
        <HistoricalPerformanceBarChart chartData={[historyItem] as any} />
      </div>,
    );

    expect(container.textContent).toContain("Area: good_density");
    expect(container.textContent).toContain("Line: P75");
    expect(container.textContent).toContain("Bar: good_density");
  });

  it("renders the historical performance card with chart content and thresholds", () => {
    const { container } = render(
      <CurrentPerformanceChartContext.Provider value="Area">
        <HistoricalPerformanceCard
          title="Largest Contentful Paint (LCP)"
          histogramData={[historyItem] as any}
        />
      </CurrentPerformanceChartContext.Provider>,
    );

    expect(container.textContent).toContain("Largest Contentful Paint (LCP)");
    expect(container.textContent).toContain("Dynamic chart: 1");
    expect(container.textContent).toMatch(/Good:/);
    expect(container.textContent).toMatch(/Needs Improvement:/);
  });

  it("renders the historical dashboard with grouped metric cards and filters", () => {
    formatCruxReportMock.mockReturnValue([historyItem]);
    groupByMock.mockReturnValue({
      largest_contentful_paint: [historyItem],
      interaction_to_next_paint: [historyItem],
      cumulative_layout_shift: [historyItem],
      first_contentful_paint: [historyItem],
      experimental_time_to_first_byte: [historyItem],
      round_trip_time: [historyItem],
    });

    const { container } = render(
      <HistoricalDashboard
        reportMap={{
          originAll: [report] as any,
          originDESKTOP: [report] as any,
          originTABLET: [report] as any,
          originPHONE: [report] as any,
          urlAll: [report] as any,
          urlDESKTOP: [report] as any,
          urlTABLET: [report] as any,
          urlPHONE: [report] as any,
        }}
      />,
    );

    expect(container.textContent).toMatch(/Historical CrUX Report for 2024-1-31\s+to 2024-1-31/);
    expect(container.textContent).toMatch(/Form Factors/);
    expect(container.textContent).toContain("Largest Contentful Paint (LCP)");
    expect(container.textContent).toContain("Round Trip Time (RTT)");
  });

  it("fetches all historical crux variants before rendering the charts section", async () => {
    getHistoricalCruxDataMock.mockResolvedValue([report]);
    formatCruxReportMock.mockReturnValue([historyItem]);
    groupByMock.mockReturnValue({
      largest_contentful_paint: [historyItem],
      interaction_to_next_paint: [historyItem],
      cumulative_layout_shift: [historyItem],
      first_contentful_paint: [historyItem],
      experimental_time_to_first_byte: [historyItem],
      round_trip_time: [historyItem],
    });

    const { container } = render(await HistoricalChartsSection({ url: "https://example.com" }));

    expect(getHistoricalCruxDataMock).toHaveBeenCalledTimes(8);
    expect(container.textContent).toContain("Largest Contentful Paint (LCP)");
  });
});
