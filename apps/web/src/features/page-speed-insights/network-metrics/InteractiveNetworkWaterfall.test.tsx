import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InteractiveNetworkWaterfall } from "@/features/page-speed-insights/network-metrics/InteractiveNetworkWaterfall";
import {
  buildWaterfallRows,
  type NetworkWaterfallRow,
} from "@/features/page-speed-insights/network-metrics/networkWaterfallData";

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

const blockingRow: NetworkWaterfallRow = {
  ...rows[0]!,
  id: "blocking-script",
  renderBlocking: "blocking",
  segments: rows[0]!.segments?.map((seg) => ({ ...seg, renderBlocking: "blocking" })),
};

const markRow: NetworkWaterfallRow = {
  id: "user-timing-0",
  kind: "user-mark",
  label: "app-ready",
  resourceType: "User timing",
  networkStart: 90,
  networkEnd: 90,
  duration: 0,
};

const measureRow: NetworkWaterfallRow = {
  id: "user-timing-1",
  kind: "user-measure",
  label: "hydrate",
  resourceType: "User timing",
  networkStart: 100,
  networkEnd: 140,
  duration: 40,
  segments: [{ id: "m1", start: 100, end: 140, label: "hydrate" }],
};

const taskRow: NetworkWaterfallRow = {
  id: "tasks",
  kind: "task",
  label: "Tasks (2)",
  resourceType: "Task",
  networkStart: 150,
  networkEnd: 220,
  duration: 70,
  segments: [
    { id: "t0", start: 150, end: 165, label: "a.js", taskKind: "short" },
    { id: "t1", start: 166, end: 220, label: "b.js", taskKind: "long" },
  ],
};

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
    expect(screen.getAllByText("app.js").length).toBeGreaterThan(0);
    expect(screen.getAllByText("style.css").length).toBeGreaterThan(0);
    expect(screen.getAllByText("50 ms").length).toBeGreaterThan(0);
    expect(screen.getAllByText("250 ms").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("waterfall-milestone-legend").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("waterfall-tick-grid").length).toBeGreaterThan(0);
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

    const detail = screen.getByTestId("waterfall-row-detail");
    expect(detail).toBeTruthy();
    expect(detail.textContent).toContain("Queue");
    expect(detail.textContent).toContain("20 ms");
    expect(detail.textContent).toContain("Network");
    expect(detail.textContent).toContain("150 ms");
    expect(detail.textContent).toContain("https://example.com/app.js");
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

    const mobileButton = container.querySelector(".lg\\:hidden button");
    expect(mobileButton).toBeTruthy();
    fireEvent.click(mobileButton!);
    expect(onSelectRow).toHaveBeenCalledWith(rows[0]?.id);
  });

  it("shows empty state when no rows are provided", () => {
    render(<InteractiveNetworkWaterfall rows={[]} timeRange={timeRange} />);
    expect(screen.getByText("No requests match the current filters.")).toBeTruthy();
  });

  it("applies the selected height size to the scroll container", () => {
    render(
      <InteractiveNetworkWaterfall
        rows={rows}
        timeRange={timeRange}
        heightSize="large"
      />,
    );

    expect(screen.getByTestId("waterfall-scroll-container")).toHaveAttribute(
      "data-height-size",
      "large",
    );
    expect(screen.getByTestId("waterfall-scroll-container").className).toContain(
      "max-h-[80vh]",
    );
  });

  it("renders blocking badge, user-mark dots, measure bars, and multi-segment tasks", () => {
    render(
      <InteractiveNetworkWaterfall
        rows={[blockingRow, markRow, measureRow, taskRow]}
        timeRange={{ minStart: 50, maxEnd: 250 }}
      />,
    );

    expect(screen.getAllByTestId("waterfall-blocking-badge").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("waterfall-user-mark-dot").length).toBeGreaterThan(0);
    expect(screen.getAllByText("app-ready").length).toBeGreaterThan(0);
    expect(screen.getAllByText("hydrate").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tasks (2)").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("waterfall-bar-track").length).toBeGreaterThan(0);
  });

  it("marks critical-chain requests on the row and the bar", () => {
    const chainRow: NetworkWaterfallRow = {
      ...rows[1]!,
      id: "chain-css",
      isCriticalChain: true,
      chain: { endMs: 400, isLongest: true },
      segments: rows[1]!.segments?.map((segment) => ({
        ...segment,
        isCriticalChain: true,
        chain: { endMs: 400, isLongest: true },
      })),
    };

    render(
      <InteractiveNetworkWaterfall
        rows={[chainRow, rows[0]!]}
        timeRange={timeRange}
      />,
    );

    const badges = screen.getAllByTestId("waterfall-chain-badge");
    expect(badges.length).toBeGreaterThan(0);
    expect(badges.every((badge) => badge.textContent === "Critical path")).toBe(true);
    expect(badges[0]).toHaveAttribute("data-critical-chain", "longest");
    expect(document.querySelector('[data-critical-chain="longest"]')).toBeTruthy();
  });

  it("shows bar info in a portaled popover on hover", async () => {
    render(
      <InteractiveNetworkWaterfall
        rows={[blockingRow]}
        timeRange={{ minStart: 50, maxEnd: 250 }}
      />,
    );

    const bars = screen.getAllByLabelText(/app\.js|example\.com\/app\.js/i);
    fireEvent.mouseEnter(bars[0]!);

    expect(await screen.findByTestId("waterfall-bar-tooltip")).toBeTruthy();
    expect(screen.getByTestId("waterfall-bar-tooltip").textContent).toMatch(/Blocking/);
  });
});
