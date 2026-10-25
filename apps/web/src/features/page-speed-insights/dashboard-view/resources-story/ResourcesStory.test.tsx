import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

let items: InsightsContextItem[] = [];

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: () => items,
}));

vi.mock("@/features/page-speed-insights/waterfall/UnifiedWaterfall", () => ({
  UnifiedWaterfall: () => <div>Waterfall exhibit</div>,
}));

vi.mock("@/features/page-speed-insights/javascript-metrics/BootupTimeChartCard", () => ({
  BootupTimeChartCard: () => <div>Bootup exhibit</div>,
}));

vi.mock("@/features/page-speed-insights/javascript-metrics/MainThreadWorkChartCard", () => ({
  MainThreadWorkChartCard: () => <div>Main thread exhibit</div>,
}));

vi.mock("@/features/page-speed-insights/script-treemap/ScriptTreemapChartCard", () => ({
  ScriptTreemapChartCard: () => <div>Script treemap exhibit</div>,
}));

vi.mock("@/features/page-speed-insights/page-load-timeline/buildPageLoadTimeline", () => ({
  buildPageLoadTimelineBundle: () => ({
    load: {
      label: "Mobile",
      requests: [
        {
          url: "https://cdn.example.com/app.js",
          resourceType: "Script",
          networkRequestTime: 10,
          networkEndTime: 80,
          transferSize: 120 * 1024,
          resourceSize: 400 * 1024,
          renderBlocking: "non-blocking",
          isCriticalChain: false,
          coverage: { totalBytes: 400 * 1024, wastedBytes: 80 * 1024 },
        },
      ],
      longTasks: [{ url: "https://cdn.example.com/app.js", startTime: 90, duration: 120 }],
    },
    timeline: { events: [], axisEndMs: 1000 },
  }),
}));

import { ResourcesStory } from "@/features/page-speed-insights/dashboard-view/resources-story/ResourcesStory";

const KB = 1024;

function wastedReport(): InsightsContextItem {
  return {
    label: "Mobile",
    item: {
      lighthouseResult: {
        audits: {
          "resource-summary": {
            details: {
              type: "table",
              headings: [],
              items: [
                { resourceType: "total", label: "Total", requestCount: 2, transferSize: 200 * KB },
                {
                  resourceType: "script",
                  label: "Script",
                  requestCount: 1,
                  transferSize: 120 * KB,
                },
              ],
            },
          },
          "network-requests": {
            details: {
              type: "table",
              headings: [],
              items: [
                {
                  url: "https://cdn.example.com/app.js",
                  resourceType: "Script",
                  transferSize: 120 * KB,
                },
                {
                  url: "https://example.com/photo.jpg",
                  resourceType: "Image",
                  transferSize: 30 * KB,
                },
              ],
            },
          },
          "unused-javascript": {
            details: {
              type: "opportunity",
              headings: [],
              items: [{ url: "https://cdn.example.com/app.js", wastedBytes: 80 * KB }],
            },
          },
        },
      },
    },
  } as unknown as InsightsContextItem;
}

describe("ResourcesStory", () => {
  afterEach(() => {
    items = [];
    window.history.replaceState(null, "", "/");
  });

  it("says when there is nothing to investigate", () => {
    items = [];
    render(<ResourcesStory />);
    expect(
      screen.getByText("This report has no downloaded resources to investigate."),
    ).toBeInTheDocument();
  });

  it("leads with the finding and lists suspects", () => {
    items = [wastedReport()];
    render(<ResourcesStory />);

    expect(screen.getByText(/67% of downloaded JavaScript never ran/i)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Investigate next" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Downloaded resources" })).toBeInTheDocument();
    expect(screen.queryByText("Unused JavaScript")).not.toBeInTheDocument();
  });

  it("switches the evidence when a stage is selected", () => {
    items = [wastedReport()];
    render(<ResourcesStory />);

    fireEvent.click(screen.getByRole("button", { name: /Arrived/ }));

    expect(new URLSearchParams(window.location.search).get("stage")).toBe("arrived");
    expect(screen.getByText("Waterfall exhibit")).toBeInTheDocument();
  });
});
