import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockItems = vi.hoisted(() => ({ current: [] as unknown[] }));

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: () => mockItems.current,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { PageLoadTimeline } from "./PageLoadTimeline";

function reportItem(label: string) {
  return {
    label,
    item: {
      lighthouseResult: {
        audits: {
          metrics: {
            id: "metrics",
            details: {
              type: "debugdata",
              items: [
                {
                  timeToFirstByte: 200,
                  observedFirstContentfulPaint: 1200,
                  observedLargestContentfulPaint: 2500,
                  observedFirstPaint: 1100,
                  observedDomContentLoaded: 900,
                  observedLoad: 1500,
                  observedLastVisualChange: 2800,
                  interactive: 4000,
                  observedTraceEnd: 5000,
                  totalBlockingTime: 300,
                  cumulativeLayoutShift: 0.02,
                  observedNavigationStart: 0,
                },
              ],
            },
          },
          "network-requests": {
            details: {
              type: "table",
              items: [
                {
                  url: "https://example.com/",
                  resourceType: "Document",
                  networkRequestTime: 5,
                  networkEndTime: 220,
                  transferSize: 10000,
                  statusCode: 200,
                  protocol: "h2",
                  mimeType: "text/html",
                },
                {
                  url: "https://example.com/app.css",
                  resourceType: "Stylesheet",
                  networkRequestTime: 80,
                  networkEndTime: 400,
                  transferSize: 8000,
                  statusCode: 200,
                  protocol: "h2",
                },
                {
                  url: "https://example.com/hero.png",
                  resourceType: "Image",
                  networkRequestTime: 300,
                  networkEndTime: 700,
                  transferSize: 20000,
                  statusCode: 200,
                },
              ],
              headings: [],
            },
          },
          "screenshot-thumbnails": {
            details: {
              type: "filmstrip",
              scale: 1,
              items: [{ timing: 1300, data: "data:image/png;base64,aaa", timestamp: 1300 }],
            },
          },
          "long-tasks": {
            details: {
              type: "table",
              items: [{ url: "https://example.com/a.js", startTime: 1000, duration: 200 }],
              headings: [],
            },
          },
          "lcp-breakdown-insight": {
            details: {
              type: "list",
              items: [
                {
                  type: "table",
                  items: [
                    {
                      subpart: "elementRenderDelay",
                      label: "Element render delay",
                      duration: 2000,
                    },
                    { subpart: "timeToFirstByte", label: "Time to first byte", duration: 200 },
                  ],
                },
              ],
            },
          },
          "server-response-time": { numericValue: 90 },
          redirects: { numericValue: 0, details: { type: "opportunity", items: [] } },
          "network-rtt": {
            details: { type: "table", items: [{ origin: "https://example.com", rtt: 20 }] },
          },
          "render-blocking-insight": { details: { type: "table", items: [] } },
          "font-display-insight": { details: { type: "table", items: [] } },
          "unsized-images": { details: { type: "table", items: [] } },
          "layout-shifts": { details: { type: "table", items: [] } },
          "cls-culprits-insight": { details: { type: "list", items: [] } },
          diagnostics: { details: { type: "debugdata", items: [{}] } },
          "mainthread-work-breakdown": { details: { type: "table", items: [] } },
        },
      },
    },
  };
}

describe("PageLoadTimeline", () => {
  beforeEach(() => {
    mockItems.current = [];
  });

  it("shows empty state when there are no metrics", () => {
    render(<PageLoadTimeline />);
    expect(screen.getByRole("status")).toHaveTextContent(/No lab metrics/i);
  });

  it("renders timed milestones, network rows, and long tasks", () => {
    mockItems.current = [reportItem("Mobile")];
    render(<PageLoadTimeline />);

    expect(screen.getByTestId("page-load-timeline")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-report-label")).toHaveTextContent("Mobile");
    expect(screen.getByText(/Scroll down from 0 ms/i)).toBeInTheDocument();
    expect(screen.getByText("Navigation start")).toBeInTheDocument();
    expect(screen.getByText("navigationStart")).toBeInTheDocument();
    expect(screen.getByText("FCP")).toBeInTheDocument();
    expect(screen.getByText("First Contentful Paint at 1.20 s.")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Document" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stylesheet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Image" })).toBeInTheDocument();

    const longTask = screen.getByRole("heading", { name: "Long task" }).closest("li");
    expect(longTask).toBeTruthy();
    const markerCol = longTask!.querySelector(".grid > div");
    expect(markerCol?.textContent).toMatch(/1\.00 s/);
    expect(markerCol?.textContent).toMatch(/→ 1\.20 s/);
    expect(within(longTask!).getByTestId("moment-waterfall")).toBeInTheDocument();
    expect(within(longTask!).getByText(/1\.00 s–1\.20 s/)).toBeInTheDocument();
    expect(within(longTask!).getByRole("link", { name: /a\.js/ })).toBeInTheDocument();
    // A single request stays open. Groups fold the bars and URL rows into one disclosure.
    expect(within(longTask!).queryByText("Requests")).not.toBeInTheDocument();

    expect(screen.queryByText("Network")).not.toBeInTheDocument();
    expect(screen.queryByText("Main thread")).not.toBeInTheDocument();
  });

  it("explains unattributed long tasks", () => {
    const item = reportItem("Mobile");
    const audits = item.item.lighthouseResult.audits as {
      "long-tasks": { details: { items: Array<Record<string, unknown>> } };
    };
    audits["long-tasks"].details.items = [
      { startTime: 1000, duration: 580 },
      { url: "https://example.com/a.js", startTime: 1004, duration: 80 },
    ];
    mockItems.current = [item];
    render(<PageLoadTimeline />);

    const longTask = screen.getByRole("heading", { name: "2 Long tasks" }).closest("li");
    expect(longTask).toBeTruthy();
    const scope = within(longTask!);
    const disclosure = scope.getByText("Requests").closest("details");
    expect(disclosure).toBeTruthy();
    expect(disclosure).not.toHaveAttribute("open");
    expect(scope.queryByRole("table")).not.toBeInTheDocument();

    fireEvent.click(scope.getByText("show"));
    expect(disclosure).toHaveAttribute("open");

    const label = scope.getByRole("button", { name: "Unattributed" });
    expect(label).toHaveAccessibleDescription(/did not attribute it to a script URL/i);
    const waterfall = scope.getByTestId("moment-waterfall");
    expect(waterfall).toContainElement(label);
    expect(waterfall).toContainElement(scope.getByRole("link", { name: /a\.js/ }));
    expect(waterfall).toHaveTextContent(/1\.00 s–1\.58 s · 580 ms/);
    expect(waterfall).toHaveTextContent(/1\.00 s–1\.08 s · 80 ms/);
  });

  it("switches between report labels", () => {
    mockItems.current = [reportItem("Mobile"), reportItem("Desktop")];
    render(<PageLoadTimeline />);

    expect(screen.getByTestId("timeline-report-label")).toHaveTextContent("Mobile");
    expect(screen.getByRole("button", { name: "Mobile" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Desktop" }));
    expect(screen.getByTestId("timeline-report-label")).toHaveTextContent("Desktop");
  });
});
