import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseNetworkMetricSeries = vi.hoisted(() => vi.fn());

vi.mock("@/features/page-speed-insights/network-metrics/useNetworkMetricsStore", () => ({
  useNetworkMetricSeries: () => mockUseNetworkMetricSeries(),
}));

vi.mock("@/features/page-speed-insights/network-metrics/InteractiveNetworkWaterfall", () => ({
  InteractiveNetworkWaterfall: () => <div data-testid="interactive-waterfall" />,
}));

import { NetworkWaterfallCard } from "@/features/page-speed-insights/network-metrics/NetworkWaterfallCard";

describe("NetworkWaterfallCard", () => {
  beforeEach(() => {
    mockUseNetworkMetricSeries.mockReset();
  });

  it("returns null when there are no network requests", () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      { label: "Desktop", networkRequests: [] },
    ]);

    const { container } = render(<NetworkWaterfallCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders waterfall and request count when data exists", () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      {
        label: "Desktop",
        fcp: 100,
        lcp: 200,
        domContentLoaded: 150,
        networkRequests: [
          {
            url: "https://example.com/",
            resourceType: "Document",
            networkRequestTime: 1,
            networkEndTime: 100,
          },
        ],
      },
    ]);

    render(<NetworkWaterfallCard />);
    expect(screen.getByText("Network Waterfall")).toBeTruthy();
    expect(screen.getByText("1 of 1 requests")).toBeTruthy();
    expect(screen.getByTestId("interactive-waterfall")).toBeTruthy();
  });

  it("renders report picker when multiple series have requests", () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      {
        label: "Desktop",
        networkRequests: [
          {
            url: "https://example.com/a",
            networkRequestTime: 1,
            networkEndTime: 10,
          },
        ],
      },
      {
        label: "Mobile",
        networkRequests: [
          {
            url: "https://example.com/b",
            networkRequestTime: 2,
            networkEndTime: 20,
          },
        ],
      },
    ]);

    render(<NetworkWaterfallCard />);
    expect(screen.getByText("Desktop")).toBeTruthy();
  });

  it("uses stacked full-width controls on narrow viewports", () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      {
        label: "Desktop",
        networkRequests: [
          {
            url: "https://example.com/",
            networkRequestTime: 1,
            networkEndTime: 10,
          },
        ],
      },
    ]);

    const { container } = render(<NetworkWaterfallCard />);
    expect(container.querySelector(".flex-col.gap-2.md\\:flex-row")).toBeTruthy();
    expect(container.querySelector(".w-full.md\\:w-auto")).toBeTruthy();
  });
});
