import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseNetworkMetricSeries = vi.hoisted(() => vi.fn());

vi.mock("@/features/page-speed-insights/network-metrics/useNetworkMetricsStore", () => ({
  useNetworkMetricSeries: () => mockUseNetworkMetricSeries(),
}));

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  CartesianGrid: () => null,
  Legend: () => <div data-testid="chart-legend" />,
  XAxis: () => null,
  YAxis: () => null,
}));

import { TimelineChartCard } from "@/features/page-speed-insights/network-metrics/TimelineChartCard";

describe("TimelineChartCard", () => {
  beforeEach(() => {
    mockUseNetworkMetricSeries.mockReset();
  });

  it("returns null when series is empty", () => {
    mockUseNetworkMetricSeries.mockReturnValue([]);
    const { container } = render(<TimelineChartCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders chart when timeline data exists", () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      {
        label: "Mobile",
        ttfb: 100,
        fcp: 200,
        lcp: 500,
        domContentLoaded: 400,
        loadTime: 700,
        interactive: 800,
        observedFirstContentfulPaint: 200,
        observedLargestContentfulPaint: 500,
        networkRequests: [],
        networkRTT: [],
        serverLatency: [],
      },
    ]);

    const { getByText, getByTestId } = render(<TimelineChartCard />);
    expect(getByText("Page Load Timeline")).toBeInTheDocument();
    expect(getByTestId("bar-chart")).toBeInTheDocument();
  });
});
