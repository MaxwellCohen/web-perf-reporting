import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Accordion } from "@/components/ui/accordion";

const mockUsePageSpeedItems = vi.hoisted(() => vi.fn());

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: () => mockUsePageSpeedItems(),
}));

vi.mock("@/features/page-speed-insights/network-metrics/NetworkWaterfallCard", () => ({
  NetworkWaterfallCard: () => <div data-testid="network-waterfall-card" />,
}));

import { NetworkWaterfallSection } from "@/features/page-speed-insights/network-metrics/NetworkWaterfallSection";

describe("NetworkWaterfallSection", () => {
  it("returns null when there are no page speed items", () => {
    mockUsePageSpeedItems.mockReturnValue([]);
    const { container } = render(<NetworkWaterfallSection />);
    expect(container.firstChild).toBeNull();
  });

  it("renders accordion section when items exist", () => {
    mockUsePageSpeedItems.mockReturnValue([{ item: {}, label: "Desktop" }]);

    const { container } = render(
      <Accordion type="multiple" defaultValue={["networkWaterfall"]}>
        <NetworkWaterfallSection />
      </Accordion>,
    );

    expect(container.textContent).toContain("Network Waterfall");
    expect(container.querySelector('[data-testid="network-waterfall-card"]')).toBeTruthy();
  });
});
