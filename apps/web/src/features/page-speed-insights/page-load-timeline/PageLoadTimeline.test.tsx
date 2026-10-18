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
    expect(screen.getAllByText("Navigation start").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("navigationStart").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("FCP").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("First Contentful Paint at 1.20 s.")).toBeInTheDocument();

    const documentRow = screen.getByRole("heading", { name: "Document" }).closest("li");
    expect(documentRow).toBeTruthy();
    expect(within(documentRow!).getByText("Server think time")).toBeInTheDocument();
    expect(within(documentRow!).getByText("TTFB")).toBeInTheDocument();
    expect(
      within(documentRow!).getByText(/Root document server response took 90 ms/),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stylesheet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Image" })).toBeInTheDocument();

    const imageHeading = screen.getByRole("heading", { name: "Image" });
    const imageCard = imageHeading.closest("div.rounded-lg") as HTMLElement | null;
    expect(imageCard).toBeTruthy();
    expect(within(imageCard!).getByText("Non-blocking")).toBeInTheDocument();
    const stylesheetCard = screen
      .getByRole("heading", { name: "Stylesheet" })
      .closest("div.rounded-lg") as HTMLElement | null;
    expect(stylesheetCard).toBeTruthy();
    expect(within(stylesheetCard!).getByText("Potentially blocking")).toBeInTheDocument();

    const overview = screen.getByTestId("timeline-overview");
    const overviewToggle = within(overview).getByRole("button", { name: /Waterfall view/ });
    expect(overviewToggle).toHaveAttribute("aria-expanded", "true");
    expect(within(overview).getByText("Waterfall view")).toBeInTheDocument();
    const allLanes = within(overview).getByTestId("overview-lanes");
    expect(within(allLanes).getByTestId("overview-time-axis")).toBeInTheDocument();
    expect(within(allLanes).getByTestId("overview-tick-grid")).toBeInTheDocument();
    expect(allLanes).toHaveTextContent("navigationStart");
    expect(allLanes).toHaveTextContent("FCP");
    expect(allLanes).toHaveTextContent("LCP");
    expect(allLanes).toHaveTextContent("CWV");
    expect(allLanes).toHaveTextContent("document downloaded");
    expect(allLanes).toHaveTextContent("Screenshot");
    expect(within(allLanes).getAllByTitle(/FCP: 1\.20 s/).length).toBeGreaterThan(0);
    expect(within(allLanes).getAllByTitle(/LCP: 2\.50 s/).length).toBeGreaterThan(0);
    const focus = within(overview).getByTestId("overview-focus");
    fireEvent.click(within(focus).getByRole("button", { name: /Blocking/ }));
    expect(within(overview).getByText("Waterfall view")).toBeInTheDocument();
    const blockingLanes = within(overview).getByTestId("overview-lanes");
    expect(blockingLanes.querySelectorAll("li")).toHaveLength(2);
    expect(blockingLanes).toHaveTextContent("style downloaded");
    expect(blockingLanes).toHaveTextContent("Long task");
    expect(blockingLanes).not.toHaveTextContent("a.js");
    expect(within(blockingLanes).getAllByTitle(/style downloaded:.*320 ms/).length).toBeGreaterThan(
      0,
    );
    expect(within(blockingLanes).getAllByTitle(/Long task:.*200 ms/).length).toBeGreaterThan(0);
    expect(blockingLanes).not.toHaveTextContent("hero.png");
    expect(blockingLanes).not.toHaveTextContent("image downloaded");
    expect(blockingLanes).not.toHaveTextContent("FCP");
    expect(blockingLanes).not.toHaveTextContent("LCP");

    fireEvent.click(within(overview).getByRole("button", { name: /Waterfall view/ }));
    expect(overviewToggle).toHaveAttribute("aria-expanded", "false");
    expect(within(overview).queryByTestId("overview-lanes")).not.toBeInTheDocument();
    expect(within(overview).queryByTestId("overview-focus")).not.toBeInTheDocument();
    fireEvent.click(within(overview).getByRole("button", { name: /Waterfall view/ }));
    expect(overviewToggle).toHaveAttribute("aria-expanded", "true");
    expect(within(overview).getByTestId("overview-lanes")).toBeInTheDocument();

    expect(screen.queryByTestId("parallel-cluster")).not.toBeInTheDocument();
    expect(screen.queryByText("Parallel")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Document" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stylesheet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Image" })).toBeInTheDocument();

    const longTask = screen.getByRole("heading", { name: "Long task" }).closest("li");
    expect(longTask).toBeTruthy();
    const markerCol = longTask!.querySelector(".grid > div");
    expect(markerCol?.textContent).toMatch(/1\.00 s/);
    expect(markerCol?.textContent).toMatch(/1\.20 s/);
    expect(within(longTask!).getByTestId("moment-waterfall")).toBeInTheDocument();
    expect(within(longTask!).getByText(/1\.00 s–1\.20 s/)).toBeInTheDocument();
    expect(within(longTask!).getByRole("link", { name: /a\.js/ })).toBeInTheDocument();
    // A single task stays open. Groups fold the bars into a Tasks disclosure.
    expect(within(longTask!).queryByText("Tasks")).not.toBeInTheDocument();
    expect(within(longTask!).queryByText("Requests")).not.toBeInTheDocument();

    expect(screen.queryByText("Network")).not.toBeInTheDocument();
  });

  it("shows coverage on a stylesheet row", () => {
    const item = reportItem("Mobile");
    const audits = item.item.lighthouseResult.audits as Record<string, unknown>;
    audits["unused-css-rules"] = {
      id: "unused-css-rules",
      details: {
        type: "opportunity",
        items: [{ url: "https://example.com/app.css", wastedBytes: 6000, totalBytes: 8000 }],
      },
    };
    mockItems.current = [item];
    render(<PageLoadTimeline />);

    const stylesheet = screen.getByRole("heading", { name: "Stylesheet" }).closest("li");
    expect(stylesheet).toBeTruthy();
    expect(
      within(stylesheet!).getByText("25% used · 2.0 KiB used of 7.8 KiB · 5.9 KiB unused"),
    ).toBeInTheDocument();
  });

  it("shows request priority on a network row", () => {
    const item = reportItem("Mobile");
    const audits = item.item.lighthouseResult.audits as {
      "network-requests": { details: { items: Array<Record<string, unknown>> } };
    };
    audits["network-requests"].details.items = audits["network-requests"].details.items.map(
      (row) => (row.url === "https://example.com/app.css" ? { ...row, priority: "High" } : row),
    );
    mockItems.current = [item];
    render(<PageLoadTimeline />);

    const stylesheet = screen.getByRole("heading", { name: "Stylesheet" }).closest("li");
    expect(stylesheet).toBeTruthy();
    expect(within(stylesheet!).getByText("Priority High")).toBeInTheDocument();
  });

  it("shows script size, download time, and coverage on an attributed long task", () => {
    const item = reportItem("Mobile");
    const audits = item.item.lighthouseResult.audits as {
      "network-requests": { details: { items: Array<Record<string, unknown>> } };
    } & Record<string, unknown>;
    audits["network-requests"].details.items.push({
      url: "https://example.com/a.js",
      resourceType: "Script",
      networkRequestTime: 600,
      networkEndTime: 900,
      transferSize: 50000,
      statusCode: 200,
    });
    audits["unused-javascript"] = {
      id: "unused-javascript",
      details: {
        type: "opportunity",
        items: [{ url: "https://example.com/a.js", wastedBytes: 25000, wastedPercent: 50 }],
      },
    };
    mockItems.current = [item];
    render(<PageLoadTimeline />);

    const longTask = screen.getByRole("heading", { name: "Long task" }).closest("li");
    expect(longTask).toBeTruthy();
    const scope = within(longTask!);
    expect(scope.getByText("48.8 KiB · downloaded 600 ms–900 ms (300 ms)")).toBeInTheDocument();
    expect(
      scope.getByText("50% used · 24.4 KiB used of 48.8 KiB · 24.4 KiB unused"),
    ).toBeInTheDocument();
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

    const headings = screen.getAllByRole("heading", { name: "Long task" });
    expect(headings).toHaveLength(2);

    const rows = headings.map((heading) => heading.closest("li")).filter(Boolean) as HTMLElement[];
    const unattributed = rows.find((li) => li.textContent?.includes("1.00 s–1.58 s"));
    expect(unattributed).toBeTruthy();
    const scope = within(unattributed!);
    expect(scope.queryByText("Tasks")).not.toBeInTheDocument();
    const waterfall = scope.getByTestId("moment-waterfall");
    const label = within(waterfall).getByRole("button", { name: "Unattributed" });
    expect(label).toHaveAccessibleDescription(/did not attribute it to a script URL/i);
    expect(waterfall).toHaveTextContent(/1\.00 s–1\.58 s · 580 ms/);

    const attributed = rows.find((li) => within(li).queryAllByRole("link", { name: /a\.js/ }).length);
    expect(attributed).toBeTruthy();
    expect(within(attributed!).getByTestId("moment-waterfall")).toHaveTextContent(
      /1\.00 s–1\.08 s · 80 ms/,
    );
  });

  it("labels grouped short tasks as Tasks in the disclosure", () => {
    const item = reportItem("Mobile");
    const audits = item.item.lighthouseResult.audits as Record<string, unknown>;
    audits["main-thread-tasks"] = {
      id: "main-thread-tasks",
      details: {
        type: "table",
        items: [
          { startTime: 2000, duration: 20 },
          { startTime: 2020, duration: 15 },
          { startTime: 2035, duration: 10 },
        ],
        headings: [],
      },
    };
    mockItems.current = [item];
    render(<PageLoadTimeline />);

    const shortTasks = screen.getByRole("heading", { name: "3 Short tasks" }).closest("li");
    expect(shortTasks).toBeTruthy();
    const scope = within(shortTasks!);
    const disclosure = scope.getByText("Tasks").closest("details");
    expect(disclosure).toBeTruthy();
    expect(disclosure).not.toHaveAttribute("open");
    fireEvent.click(scope.getByText("show"));
    expect(disclosure).toHaveAttribute("open");
    expect(scope.getByTestId("moment-waterfall")).toBeInTheDocument();
  });

  it("hides non-blocking tasks and long tasks from the timeline", () => {
    mockItems.current = [reportItem("Mobile")];
    render(<PageLoadTimeline />);

    const filters = screen.getByTestId("timeline-task-filters");
    expect(within(filters).getByRole("button", { name: "Non-blocking" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Image" })).toBeInTheDocument();

    fireEvent.click(within(filters).getByRole("button", { name: "Non-blocking" }));

    expect(within(filters).getByRole("button", { name: "Non-blocking" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.queryByRole("heading", { name: "Image" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stylesheet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Document" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Long task" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "FCP" })).toBeInTheDocument();
    expect(filters).toHaveTextContent(/\d+ of \d+/);

    fireEvent.click(within(filters).getByRole("button", { name: "Long tasks" }));
    expect(screen.queryByRole("heading", { name: "Long task" })).not.toBeInTheDocument();

    fireEvent.click(within(filters).getByRole("button", { name: "Non-blocking" }));
    expect(screen.getByRole("heading", { name: "Image" })).toBeInTheDocument();
  });

  it("switches between report labels", () => {
    mockItems.current = [reportItem("Mobile"), reportItem("Desktop")];
    render(<PageLoadTimeline />);

    expect(screen.getByTestId("timeline-report-label")).toHaveTextContent("Mobile");
    expect(screen.getByRole("button", { name: "Mobile" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Desktop" }));
    expect(screen.getByTestId("timeline-report-label")).toHaveTextContent("Desktop");
    expect(new URLSearchParams(window.location.search).get("report")).toBe("Desktop");
  });

  it("opens the report named in the URL", () => {
    mockItems.current = [reportItem("Mobile"), reportItem("Desktop")];
    window.history.replaceState(null, "", "/?report=Desktop&tasks=non-blocking");
    render(<PageLoadTimeline />);

    expect(screen.getByTestId("timeline-report-label")).toHaveTextContent("Desktop");
    expect(screen.getByRole("button", { name: "Non-blocking" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Long tasks" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
