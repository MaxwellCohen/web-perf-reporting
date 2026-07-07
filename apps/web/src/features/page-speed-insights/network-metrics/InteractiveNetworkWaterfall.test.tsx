import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InteractiveNetworkWaterfall } from "@/features/page-speed-insights/network-metrics/InteractiveNetworkWaterfall";
import { buildWaterfallRows } from "@/features/page-speed-insights/network-metrics/networkWaterfallData";

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderTableValue", () => ({
  formatBytes: (value: number) => `${value} B`,
}));

const rows = buildWaterfallRows([
  {
    url: "https://example.com/app.js",
    resourceType: "Script",
    networkRequestTime: 100,
    networkEndTime: 250,
    rendererStartTime: 80,
    transferSize: 12000,
    statusCode: 200,
  },
  {
    url: "https://example.com/style.css",
    resourceType: "Stylesheet",
    networkRequestTime: 50,
    networkEndTime: 120,
    transferSize: 4000,
    statusCode: 200,
  },
]);

const timeRange = { minStart: 50, maxEnd: 250 };

describe("InteractiveNetworkWaterfall", () => {
  it("renders request rows and time axis", () => {
    render(
      <InteractiveNetworkWaterfall
        rows={rows}
        timeRange={timeRange}
        milestones={{ fcp: 120, lcp: 200 }}
      />,
    );

    expect(screen.getByTestId("interactive-network-waterfall")).toBeTruthy();
    expect(screen.getAllByText(/example.com\/app.js/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/example.com\/style.css/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("50ms").length).toBeGreaterThan(0);
    expect(screen.getAllByText("250ms").length).toBeGreaterThan(0);
  });

  it("shows detail panel when a row is selected", () => {
    const onSelectRow = vi.fn();
    render(
      <InteractiveNetworkWaterfall
        rows={rows}
        timeRange={timeRange}
        selectedId={rows[0]?.id}
        onSelectRow={onSelectRow}
      />,
    );

    expect(screen.getByTestId("waterfall-row-detail")).toBeTruthy();
    expect(screen.getByText("Queue: 20 ms")).toBeTruthy();
    expect(screen.getByText("Network: 150 ms")).toBeTruthy();
  });

  it("renders milestone lines spanning all request rows", () => {
    render(
      <InteractiveNetworkWaterfall
        rows={rows}
        timeRange={timeRange}
        milestones={{ fcp: 120, lcp: 200, domContentLoaded: 180 }}
      />,
    );

    const overlays = screen.getAllByTestId("waterfall-milestone-overlay");
    expect(overlays.length).toBeGreaterThan(0);
    expect(overlays.some((overlay) => overlay.querySelector('[title="FCP: 120 ms"]'))).toBe(true);
    expect(overlays.some((overlay) => overlay.querySelector('[title="LCP: 200 ms"]'))).toBe(true);
    expect(overlays.some((overlay) => overlay.querySelector('[title="DCL: 180 ms"]'))).toBe(true);
  });

  it("calls onSelectRow when a mobile row is tapped", () => {
    const onSelectRow = vi.fn();
    const { container } = render(
      <InteractiveNetworkWaterfall
        rows={rows}
        timeRange={timeRange}
        onSelectRow={onSelectRow}
      />,
    );

    const mobileButton = container.querySelector(".md\\:hidden button");
    expect(mobileButton).toBeTruthy();
    fireEvent.click(mobileButton!);
    expect(onSelectRow).toHaveBeenCalledWith(rows[0]?.id);
  });

  it("shows empty state when no rows are provided", () => {
    render(<InteractiveNetworkWaterfall rows={[]} timeRange={timeRange} />);
    expect(screen.getByText("No requests match the current filters.")).toBeTruthy();
  });
});
