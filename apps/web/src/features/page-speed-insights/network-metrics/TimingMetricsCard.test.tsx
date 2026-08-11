import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseNetworkMetricSeries = vi.hoisted(() => vi.fn());

vi.mock("@/features/page-speed-insights/network-metrics/useNetworkMetricsStore", () => ({
  useNetworkMetricSeries: () => mockUseNetworkMetricSeries(),
}));

vi.mock("@/features/page-speed-insights/shared/TableCard", () => ({
  TableCard: ({ title }: { title: string }) => <div data-testid="table-card">{title}</div>,
}));

import { TimingMetricsCard } from "@/features/page-speed-insights/network-metrics/TimingMetricsCard";

describe("TimingMetricsCard", () => {
  beforeEach(() => {
    mockUseNetworkMetricSeries.mockReset();
  });

  it("returns null when metrics have no timing data", () => {
    mockUseNetworkMetricSeries.mockReturnValue([{ label: "Mobile" }, { label: "Desktop" }]);
    const { container } = render(<TimingMetricsCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders when metrics have ttfb", () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      { label: "Mobile", ttfb: 100, fcp: 0, lcp: 0, speedIndex: 0, totalBlockingTime: 0 },
    ]);
    const { container } = render(<TimingMetricsCard />);
    expect(container.textContent).toContain("Page Load Timing Metrics");
  });
});
