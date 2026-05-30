import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const formatCruxReportMock = vi.fn();
const groupByMock = vi.fn();

vi.mock("@/lib/utils", () => ({
  formatCruxReport: (...args: unknown[]) => formatCruxReportMock(...args),
  formatDate: (d: { year: number; month: number; day: number }) => `${d.year}-${d.month}-${d.day}`,
  groupBy: (...args: unknown[]) => groupByMock(...args),
}));

vi.mock("@/components/common/FormFactorPercentPieChart", () => ({
  PercentTable: ({ title, dateRange }: { title: string; dateRange?: string }) => (
    <div data-testid="percent-table">
      {title}
      {dateRange ? ` - ${dateRange}` : ""}
    </div>
  ),
}));

vi.mock("@/components/latest-crux/PerformanceOptions", () => ({
  PerformanceOptions: ({
    setChartType,
    setReportScope,
    setDeviceType,
    chartKeys,
    children,
  }: {
    setChartType: (v: string) => void;
    setReportScope: (v: string) => void;
    setDeviceType: (v: string) => void;
    chartKeys: string[];
    children?: React.ReactNode;
  }) => (
    <div data-testid="performance-options">
      <button type="button" onClick={() => setChartType("Gauge Chart")}>
        Set Gauge
      </button>
      <button type="button" onClick={() => setReportScope("url")}>
        Set URL scope
      </button>
      <button type="button" onClick={() => setDeviceType("PHONE")}>
        Set Phone
      </button>
      <span>{chartKeys.join(",")}</span>
      {children}
    </div>
  ),
}));

vi.mock("@/components/latest-crux/PerformanceCard", async () => {
  const React = await import("react");
  return {
    ChartMap: {
      Histogram: "histogram",
      "Gauge Chart": "gauge",
      "Stacked Bar": "bar",
      "Radial Chart": "radial",
    },
    CurrentPerformanceChartContext: React.createContext("bar"),
    CurrentPerformanceCard: ({
      title,
      histogramData,
    }: {
      title: string;
      histogramData: unknown;
    }) => (
      <div data-testid="performance-card">
        {title}
        {histogramData ? "has-data" : "no-data"}
      </div>
    ),
  };
});

import { CurrentPerformanceDashboard } from "@/components/latest-crux/PerformanceDashboard";

const report = {
  record: {
    collectionPeriod: {
      firstDate: { year: 2024, month: 1, day: 1 },
      lastDate: { year: 2024, month: 1, day: 31 },
    },
    metrics: {
      form_factors: { fractions: { desktop: 0.5, phone: 0.3, tablet: 0.2 } },
      navigation_types: { fractions: { navigate: 0.7, reload: 0.3 } },
    },
  },
};

const histogramData = {
  good_density: 0.5,
  ni_density: 0.3,
  poor_density: 0.2,
  good_max: 1000,
  ni_max: 2000,
  P75: 900,
};

describe("CurrentPerformanceDashboard", () => {
  beforeEach(() => {
    formatCruxReportMock.mockReset();
    groupByMock.mockReset();
  });

  it("renders with report data and metric cards", () => {
    formatCruxReportMock.mockReturnValue([
      { metric_name: "largest_contentful_paint", ...histogramData },
    ]);
    groupByMock.mockReturnValue({
      largest_contentful_paint: [histogramData],
      interaction_to_next_paint: [histogramData],
      cumulative_layout_shift: [histogramData],
      first_contentful_paint: [histogramData],
      experimental_time_to_first_byte: [histogramData],
      round_trip_time: [histogramData],
    });

    const reportMap = {
      originAll: report,
      originDESKTOP: report,
      originTABLET: report,
      originPHONE: report,
      urlAll: report,
      urlDESKTOP: report,
      urlTABLET: report,
      urlPHONE: report,
    };

    const { container } = render(<CurrentPerformanceDashboard reportMap={reportMap as any} />);

    expect(container.textContent).toContain("Latest Performance Report for");
    expect(container.textContent).toContain("2024-1-1 - 2024-1-31");
    expect(container.textContent).toContain("Largest Contentful Paint (LCP)");
    expect(container.textContent).toContain("Form Factors");
  });

  it("renders without date when collectionPeriod is missing", () => {
    formatCruxReportMock.mockReturnValue([]);
    groupByMock.mockReturnValue({});

    const reportMap = {
      originAll: { record: {} },
      originDESKTOP: null,
      originTABLET: null,
      originPHONE: null,
      urlAll: null,
      urlDESKTOP: null,
      urlTABLET: null,
      urlPHONE: null,
    };

    const { container } = render(<CurrentPerformanceDashboard reportMap={reportMap as any} />);

    expect(container.textContent).toContain("Latest Performance Report for");
  });

  it("renders Navigation Types when navigation_types present", () => {
    formatCruxReportMock.mockReturnValue([]);
    groupByMock.mockReturnValue({});

    const reportWithNav = {
      ...report,
      record: {
        ...report.record,
        metrics: {
          ...report.record.metrics,
          navigation_types: { fractions: { navigate: 0.7, reload: 0.3 } },
        },
      },
    };

    const reportMap = {
      originAll: reportWithNav,
      originDESKTOP: reportWithNav,
      originTABLET: reportWithNav,
      originPHONE: reportWithNav,
      urlAll: reportWithNav,
      urlDESKTOP: reportWithNav,
      urlTABLET: reportWithNav,
      urlPHONE: reportWithNav,
    };

    const { container } = render(<CurrentPerformanceDashboard reportMap={reportMap as any} />);

    expect(container.textContent).toContain("Navigation Types");
  });
});
