import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseNetworkMetricSeries = vi.hoisted(() => vi.fn());

vi.mock("@/features/page-speed-insights/network-metrics/useNetworkMetricsStore", () => ({
  useNetworkMetricSeries: () => mockUseNetworkMetricSeries(),
}));

import { ServerLatencyCard } from "@/features/page-speed-insights/network-metrics/ServerLatencyCard";

describe("ServerLatencyCard", () => {
  beforeEach(() => {
    mockUseNetworkMetricSeries.mockReset();
  });

  it("returns null when metrics have no serverLatency", () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      { label: "Mobile", serverLatency: [] },
      { label: "Desktop", serverLatency: [] },
    ]);
    const { container } = render(<ServerLatencyCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders TableCard when metrics have serverLatency", () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      {
        label: "Mobile",
        serverLatency: [
          {
            origin: "https://example.com",
            serverResponseTime: 100,
          },
        ],
      },
    ]);
    const { container } = render(<ServerLatencyCard />);
    expect(container.textContent).toContain("Server Backend Latencies");
  });
});
