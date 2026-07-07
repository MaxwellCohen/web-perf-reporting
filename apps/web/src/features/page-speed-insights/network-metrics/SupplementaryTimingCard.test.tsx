import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseNetworkMetricSeries = vi.hoisted(() => vi.fn());

vi.mock("@/features/page-speed-insights/network-metrics/useNetworkMetricsStore", () => ({
  useNetworkMetricSeries: () => mockUseNetworkMetricSeries(),
}));

vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

import { SupplementaryTimingCard } from "@/features/page-speed-insights/network-metrics/SupplementaryTimingCard";

describe("SupplementaryTimingCard", () => {
  beforeEach(() => {
    mockUseNetworkMetricSeries.mockReset();
  });

  it("returns null when no supplementary timing data exists", () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      { label: "Mobile", ttfb: 0, domContentLoaded: 0, loadTime: 0, interactive: 0 },
    ]);

    const { container } = render(<SupplementaryTimingCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders supplementary timing metrics", () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      { label: "Mobile", ttfb: 100, domContentLoaded: 400, loadTime: 700, interactive: 800 },
    ]);

    const { container } = render(<SupplementaryTimingCard />);
    expect(container.textContent).toContain("Supplementary Timing Metrics");
    expect(container.textContent).toContain("TTFB");
    expect(container.textContent).toContain("DOM Content Loaded");
  });
});
