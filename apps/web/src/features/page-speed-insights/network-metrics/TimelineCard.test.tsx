import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseNetworkMetricSeries = vi.hoisted(() => vi.fn());

vi.mock("@/features/page-speed-insights/network-metrics/useNetworkMetricsStore", () => ({
  useNetworkMetricSeries: () => mockUseNetworkMetricSeries(),
}));

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderTableValue", () => ({
  RenderMSValue: ({ value }: { value: number }) => <span data-testid="ms-value">{value} ms</span>,
}));

import { TimelineCard } from "@/features/page-speed-insights/network-metrics/TimelineCard";

describe("TimelineCard", () => {
  beforeEach(() => {
    mockUseNetworkMetricSeries.mockReset();
  });

  it("returns null when metrics is empty", () => {
    mockUseNetworkMetricSeries.mockReturnValue([]);
    const { container } = render(<TimelineCard />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when metrics have no event data", () => {
    mockUseNetworkMetricSeries.mockReturnValue([{ label: "Desktop" }, { label: "Mobile" }]);
    const { container } = render(<TimelineCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders card with timeline table when metrics have event data", () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      {
        label: "Desktop",
        ttfb: 100,
        fcp: 500,
        observedNavigationStart: 0,
      },
    ]);
    const { container } = render(<TimelineCard />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders multiple report columns when multiple metrics", () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      { label: "Desktop", ttfb: 80, fcp: 400, observedNavigationStart: 0 },
      { label: "Mobile", ttfb: 120, fcp: 600, observedNavigationStart: 0 },
    ]);
    const { container } = render(<TimelineCard />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("shows N/A for missing values in report columns", () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      {
        label: "Desktop",
        ttfb: 100,
        observedNavigationStart: 0,
        observedFirstPaint: 200,
      },
    ]);
    const { container } = render(<TimelineCard />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
