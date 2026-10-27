import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockItems = vi.hoisted(() => ({ current: [] as unknown[] }));
const mockScreenshots = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: () => mockItems.current,
  useFullPageScreenshots: () => mockScreenshots.current,
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
    mockScreenshots.current = {};
  });

  it("shows empty state when there are no metrics", () => {
    render(<PageLoadTimeline />);
    expect(screen.getByRole("status")).toHaveTextContent(/No lab metrics/i);
  });

  it("shows the LCP element screenshot on the LCP card", () => {
    const shot = "data:image/jpeg;base64,abc";
    mockScreenshots.current = {
      Mobile: {
        screenshot: { data: shot, width: 400, height: 800 },
        nodes: {
          "lcp-node": { left: 10, top: 20, width: 120, height: 40, right: 130, bottom: 60 },
        },
      },
    };
    const item = reportItem("Mobile");
    const breakdown = item.item.lighthouseResult.audits["lcp-breakdown-insight"].details.items;
    breakdown.push({
      type: "node",
      // @ts-expect-error - lhId is not in the type
      lhId: "lcp-node",
      nodeLabel: "Hero headline",
      snippet: "<h1>",
    });
    mockItems.current = [item];

    render(<PageLoadTimeline />);

    const card = document.getElementById("timeline-moment-sub-lcp");
    expect(card).toBeTruthy();
    const shotEl = within(card!).getByTestId("lcp-element-screenshot");
    expect(shotEl.querySelector(".lh-element-screenshot")).toBeTruthy();
    expect(shotEl.querySelector("img")).toHaveAttribute("src", shot);
  });

  it("copies the filtered timeline as markdown", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    mockItems.current = [reportItem("Mobile")];
    render(<PageLoadTimeline />);

    fireEvent.click(screen.getByTestId("copy-timeline-markdown"));
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledOnce();
    });
    const markdown = writeText.mock.calls[0]?.[0] as string;
    expect(markdown).toContain("# Page load timeline — Mobile");
    expect(markdown).toContain("### LCP");
    expect(markdown).not.toContain("data:image");
  });

  it("renders timed milestones, network rows, and long tasks", () => {
    mockItems.current = [reportItem("Mobile")];
    render(<PageLoadTimeline />);

    expect(screen.getByTestId("page-load-timeline")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-report-label")).toHaveTextContent("Mobile");
    expect(screen.getByText(/Scroll down from 0 ms/i)).toBeInTheDocument();
    expect(screen.getAllByText("Navigation start").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("FCP").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("First Contentful Paint at 1.20 s.")).toBeInTheDocument();

    const documentRow = screen.getByRole("heading", { name: "Document" }).closest("li");
    expect(documentRow).toBeTruthy();
    expect(within(documentRow!).queryByText("Server think time")).not.toBeInTheDocument();
    expect(within(documentRow!).queryByText("TTFB")).not.toBeInTheDocument();

    const serverRow = screen.getByRole("heading", { name: "Server think time" }).closest("li");
    expect(serverRow).toBeTruthy();
    expect(serverRow).not.toBe(documentRow);
    expect(serverRow).toHaveAttribute("id", "timeline-moment-req-server");
    expect(
      within(serverRow!).getByText(/Root document server response took 90 ms/),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "TTFB" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "First Paint" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stylesheet downloaded" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Image" })).toBeInTheDocument();

    const imageHeading = screen.getByRole("heading", { name: "Image" });
    const imageCard = imageHeading.closest("div.rounded-lg") as HTMLElement | null;
    expect(imageCard).toBeTruthy();
    expect(within(imageCard!).getByText("Non-blocking")).toBeInTheDocument();
    const stylesheetCard = screen
      .getByRole("heading", { name: "Stylesheet downloaded" })
      .closest("div.rounded-lg") as HTMLElement | null;
    expect(stylesheetCard).toBeTruthy();
    expect(within(stylesheetCard!).getByText("Potentially blocking")).toBeInTheDocument();

    const overview = screen.getByTestId("timeline-overview");
    const overviewToggle = within(overview).getByRole("button", { name: /Waterfall view/ });
    expect(overviewToggle).toHaveAttribute("aria-expanded", "false");
    expect(within(overview).getByText("Waterfall view")).toBeInTheDocument();
    expect(within(overview).queryByTestId("overview-lanes")).not.toBeInTheDocument();
    expect(within(overview).queryByTestId("overview-focus")).not.toBeInTheDocument();
    expect(within(overview).queryByTestId("overview-time-range")).not.toBeInTheDocument();

    fireEvent.click(overviewToggle);
    expect(overviewToggle).toHaveAttribute("aria-expanded", "true");
    const allLanes = within(overview).getByTestId("overview-lanes");
    expect(within(allLanes).getAllByTestId("overview-time-axis").length).toBeGreaterThan(0);
    expect(within(allLanes).getAllByTestId("overview-tick-grid").length).toBeGreaterThan(0);
    const guideLines = within(allLanes).getAllByTestId("overview-guide-lines")[0]!;
    expect(guideLines.querySelector('[data-guide="render-fcp"]')).toBeInTheDocument();
    expect(guideLines.querySelector('[data-guide="sub-lcp"]')).toBeInTheDocument();
    expect(guideLines.querySelector('[data-guide="nav-start"]')).toBeInTheDocument();
    expect(allLanes).toHaveTextContent("FCP");
    expect(allLanes).toHaveTextContent("LCP");
    expect(allLanes).toHaveTextContent("Nav");
    expect(allLanes).toHaveTextContent("app.css");
    expect(allLanes).toHaveTextContent("hero.png");
    expect(within(allLanes).getAllByTitle(/FCP: 1\.20 s/).length).toBeGreaterThan(0);
    expect(within(allLanes).getAllByTitle(/LCP: 2\.50 s/).length).toBeGreaterThan(0);
    const focus = within(overview).getByTestId("overview-focus");
    fireEvent.click(within(focus).getByRole("button", { name: /^Blocking \(/ }));
    expect(within(overview).getByText("Waterfall view")).toBeInTheDocument();
    const blockingLanes = within(overview).getByTestId("overview-lanes");
    expect(blockingLanes).toHaveTextContent("app.css");
    expect(blockingLanes).toHaveTextContent("Task");
    expect(blockingLanes).not.toHaveTextContent("hero.png");
    // Guide markers stay visible in blocking focus.
    expect(blockingLanes).toHaveTextContent("FCP");
    expect(blockingLanes).toHaveTextContent("LCP");

    expect(within(overview).getByTestId("overview-time-range")).toBeInTheDocument();
    fireEvent.click(within(overview).getByRole("button", { name: /Waterfall view/ }));
    expect(overviewToggle).toHaveAttribute("aria-expanded", "false");
    expect(within(overview).queryByTestId("overview-lanes")).not.toBeInTheDocument();
    expect(within(overview).queryByTestId("overview-focus")).not.toBeInTheDocument();
    expect(within(overview).queryByTestId("overview-time-range")).not.toBeInTheDocument();
    fireEvent.click(within(overview).getByRole("button", { name: /Waterfall view/ }));
    expect(overviewToggle).toHaveAttribute("aria-expanded", "true");
    expect(within(overview).getByTestId("overview-lanes")).toBeInTheDocument();
    expect(within(overview).getByTestId("overview-time-range")).toBeInTheDocument();

    expect(screen.queryByTestId("parallel-cluster")).not.toBeInTheDocument();
    expect(screen.queryByText("Parallel")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Document" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stylesheet downloaded" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Image" })).toBeInTheDocument();

    const longTask = screen.getByRole("heading", { name: "Long task" }).closest("li");
    expect(longTask).toBeTruthy();
    const markerCol = longTask!.querySelector(".grid > div");
    expect(markerCol?.textContent).toMatch(/1\.00 s/);
    expect(markerCol?.textContent).toMatch(/1\.20 s/);
    expect(within(longTask!).getByTestId("moment-waterfall")).toBeInTheDocument();
    expect(
      within(longTask!).getByTestId("moment-waterfall").textContent,
    ).toMatch(/1\.00 s–1\.20 s/);
    expect(within(longTask!).getByRole("link", { name: /a\.js/ })).toBeInTheDocument();
    // A single task stays open. Groups fold the bars into a Tasks disclosure.
    expect(within(longTask!).queryByText("Tasks")).not.toBeInTheDocument();
    expect(within(longTask!).queryByText("Requests")).not.toBeInTheDocument();

    expect(screen.queryByText("Network")).not.toBeInTheDocument();
  });

  it("filters the waterfall to long tasks from the legend", () => {
    window.history.replaceState(null, "", "/");
    mockItems.current = [reportItem("Mobile")];
    render(<PageLoadTimeline />);

    const overview = screen.getByTestId("timeline-overview");
    fireEvent.click(within(overview).getByRole("button", { name: /Waterfall view/ }));
    expect(within(overview).getByTestId("overview-lanes")).toHaveTextContent("hero.png");
    fireEvent.click(within(overview).getByTestId("legend-signal-long-task"));

    const lanes = within(overview).getByTestId("overview-lanes");
    expect(lanes).toHaveTextContent("Task");
    expect(lanes).not.toHaveTextContent("hero.png");
    expect(lanes).toHaveTextContent("FCP");
    expect(within(overview).getByTestId("waterfall-signal-filter")).toHaveTextContent("Long task");

    fireEvent.click(within(overview).getByTestId("legend-signal-long-task"));
    expect(within(overview).getByTestId("overview-lanes")).toHaveTextContent("hero.png");
    window.history.replaceState(null, "", "/");
  });

  it("filters the waterfall to a time range and zooms the axis", () => {
    mockItems.current = [reportItem("Mobile")];
    render(<PageLoadTimeline />);

    const overview = screen.getByTestId("timeline-overview");
    fireEvent.click(within(overview).getByRole("button", { name: /Waterfall view/ }));
    const range = within(overview).getByTestId("overview-time-range");
    const start = within(range).getByRole("slider", { name: "Range start" });
    const end = within(range).getByRole("slider", { name: "Range end" });
    const step = Number(start.getAttribute("step"));
    const rangeStart = Math.ceil(2500 / step) * step;

    expect(within(range).queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();
    expect(within(overview).getByTestId("overview-lanes")).toHaveTextContent("FCP");

    fireEvent.change(start, { target: { value: String(rangeStart) } });

    const lanes = within(overview).getByTestId("overview-lanes");
    expect(lanes).toHaveTextContent("LCP");
    expect(lanes).toHaveTextContent("TTI");
    expect(lanes).not.toHaveTextContent("FCP");
    expect(lanes).not.toHaveTextContent("hero.png");
    expect(lanes).not.toHaveTextContent("Task");
    expect(within(overview).getByRole("button", { name: /Waterfall view/ })).toHaveTextContent(
      /of \d+ rows/,
    );
    expect(within(lanes).getAllByTestId("overview-time-axis")[0]).not.toHaveTextContent("0 ms");
    expect(within(range).getByRole("button", { name: "Reset" })).toBeInTheDocument();

    fireEvent.change(end, { target: { value: "0" } });
    expect(Number((end as HTMLInputElement).value)).toBeGreaterThan(rangeStart);
    expect(within(overview).getByRole("button", { name: /Blocking/ })).toBeDisabled();

    fireEvent.click(within(range).getByRole("button", { name: "Reset" }));
    expect(within(overview).getByTestId("overview-lanes")).toHaveTextContent("FCP");
    expect(within(range).queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();

    fireEvent.click(within(overview).getByRole("button", { name: /^Blocking \(/ }));
    fireEvent.change(start, { target: { value: String(rangeStart) } });
    expect(within(overview).getByText("No blocking work in this view.")).toBeInTheDocument();

    fireEvent.click(within(range).getByRole("button", { name: "Reset" }));
    fireEvent.click(within(overview).getByRole("button", { name: /^All \(/ }));
    const track = within(range).getByTestId("overview-time-range-track");
    track.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 200,
        bottom: 16,
        width: 200,
        height: 16,
        toJSON() {
          return {};
        },
      }) as DOMRect;
    fireEvent.pointerDown(track, { button: 0, clientX: 100, pointerId: 1 });
    expect(Number((start as HTMLInputElement).value)).toBeGreaterThan(0);
    const dragged = within(overview).getByTestId("overview-lanes");
    expect(dragged).not.toHaveTextContent("Nav");
    expect(dragged).toHaveTextContent("TTI");
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

    const stylesheet = screen.getByRole("heading", { name: "Stylesheet downloaded" }).closest("li");
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

    const stylesheet = screen.getByRole("heading", { name: "Stylesheet downloaded" }).closest("li");
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

  it("shows bootup cpu and critical-chain timing with the script info", () => {
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
    audits["bootup-time"] = {
      id: "bootup-time",
      details: {
        type: "table",
        items: [
          {
            url: "https://example.com/a.js",
            total: 420,
            scripting: 300,
            scriptParseCompile: 80,
          },
        ],
        headings: [],
      },
    };
    audits["network-dependency-tree-insight"] = {
      id: "network-dependency-tree-insight",
      details: {
        type: "list",
        items: [
          {
            type: "list-section",
            value: {
              type: "network-tree",
              longestChain: { duration: 900 },
              chains: {
                root: {
                  url: "https://example.com/",
                  navStartToEndTime: 220,
                  children: {
                    script: {
                      url: "https://example.com/a.js",
                      navStartToEndTime: 900,
                      isLongest: true,
                      transferSize: 50000,
                      children: {},
                    },
                  },
                },
              },
            },
          },
        ],
      },
    };
    mockItems.current = [item];
    render(<PageLoadTimeline />);

    const longTask = screen.getByRole("heading", { name: "Long task" }).closest("li");
    expect(longTask).toBeTruthy();
    const scope = within(longTask!);
    expect(
      scope.getByText(
        "Total CPU Time 420 ms · Script Parse 80 ms · Script Evaluation 300 ms · Other 40 ms",
      ),
    ).toBeInTheDocument();
    expect(
      scope.getByText("Longest chain · Chain time 900 ms · Extends chain 680 ms"),
    ).toBeInTheDocument();

    const script = screen.getByRole("heading", { name: "Script downloaded" }).closest("li");
    expect(script).toBeTruthy();
    expect(
      within(script!).getByText(
        "Total CPU Time 420 ms · Script Parse 80 ms · Script Evaluation 300 ms · Other 40 ms",
      ),
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
    expect(label).toHaveAttribute("aria-describedby");
    expect(
      document.getElementById(label.getAttribute("aria-describedby")!),
    ).toHaveTextContent(/did not attribute it to a script URL/i);
    expect(waterfall).toHaveTextContent(/1\.00 s–1\.58 s · 580 ms/);

    const attributed = rows.find(
      (li) => within(li).queryAllByRole("link", { name: /a\.js/ }).length,
    );
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
    expect(screen.getByRole("heading", { name: "Stylesheet downloaded" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Document" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Long task" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "FCP" })).toBeInTheDocument();
    expect(filters).toHaveTextContent(/\d+ of \d+/);

    fireEvent.click(screen.getByRole("button", { name: /Waterfall view/ }));
    const overview = screen.getByTestId("overview-lanes");
    expect(overview).not.toHaveTextContent("hero.png");
    expect(overview).toHaveTextContent("app.css");

    fireEvent.click(within(filters).getByRole("button", { name: "Long tasks" }));
    expect(screen.queryByRole("heading", { name: "Long task" })).not.toBeInTheDocument();
    expect(screen.getByTestId("overview-lanes")).not.toHaveTextContent("Task");

    fireEvent.click(within(filters).getByRole("button", { name: "Non-blocking" }));
    expect(screen.getByRole("heading", { name: "Image" })).toBeInTheDocument();
    expect(screen.getByTestId("overview-lanes")).toHaveTextContent("hero.png");
  });

  it("multi-selects a second report for side-by-side compare", () => {
    window.history.replaceState(null, "", "/");
    mockItems.current = [reportItem("Mobile"), reportItem("Desktop")];
    render(<PageLoadTimeline />);

    expect(screen.getByTestId("timeline-report-label")).toHaveTextContent("Mobile");
    expect(screen.queryByTestId("timeline-compare")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mobile" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Desktop" }));

    expect(screen.getByTestId("timeline-report-label")).toHaveTextContent("Mobile vs Desktop");
    const compare = screen.getByTestId("timeline-compare");
    const panes = within(compare).getAllByTestId("timeline-pane");
    expect(panes).toHaveLength(2);
    expect(panes[0]).toHaveAttribute("data-timeline-label", "Mobile");
    expect(panes[1]).toHaveAttribute("data-timeline-label", "Desktop");
    expect(new URLSearchParams(window.location.search).getAll("report")).toEqual([
      "Mobile",
      "Desktop",
    ]);
  });

  it("deselects a report from the compare pair", () => {
    window.history.replaceState(null, "", "/?report=Mobile&report=Desktop");
    mockItems.current = [reportItem("Mobile"), reportItem("Desktop")];
    render(<PageLoadTimeline />);

    expect(screen.getByTestId("timeline-compare")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Desktop" }));
    expect(screen.queryByTestId("timeline-compare")).not.toBeInTheDocument();
    expect(screen.getByTestId("timeline-report-label")).toHaveTextContent("Mobile");
    expect(new URLSearchParams(window.location.search).getAll("report")).toEqual(["Mobile"]);
  });

  it("opens the report named in the URL", () => {
    mockItems.current = [reportItem("Mobile"), reportItem("Desktop")];
    window.history.replaceState(null, "", "/?report=Desktop&tasks=non-blocking");
    render(<PageLoadTimeline />);

    expect(screen.getByTestId("timeline-report-label")).toHaveTextContent("Desktop");
    expect(screen.getByRole("button", { name: "Desktop" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Non-blocking" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Long tasks" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("defaults A/B runs to the first form-factor pair side-by-side", () => {
    window.history.replaceState(null, "", "/");
    mockItems.current = [reportItem("A · Mobile"), reportItem("B · Mobile")];
    render(<PageLoadTimeline />);

    expect(screen.getByTestId("timeline-report-label")).toHaveTextContent(
      "A · Mobile vs B · Mobile",
    );
    const compare = screen.getByTestId("timeline-compare");
    const panes = within(compare).getAllByTestId("timeline-pane");
    expect(panes).toHaveLength(2);
    expect(panes[0]).toHaveAttribute("data-timeline-label", "A · Mobile");
    expect(panes[1]).toHaveAttribute("data-timeline-label", "B · Mobile");
    expect(within(compare).getByTestId("timeline-aligned-moments")).toBeInTheDocument();
    expect(document.getElementById("timeline-moment-a-mobile-sub-lcp")).toBeTruthy();
    expect(document.getElementById("timeline-moment-b-mobile-sub-lcp")).toBeTruthy();
    expect(document.getElementById("timeline-moment-sub-lcp")).toBeNull();
  });

  it("aligns equal timestamps on the same compare row", () => {
    window.history.replaceState(null, "", "/?report=Mobile&report=Desktop");
    mockItems.current = [reportItem("Mobile"), reportItem("Desktop")];
    render(<PageLoadTimeline />);

    const aligned = screen.getByTestId("timeline-aligned-moments");
    const zeroRow = within(aligned)
      .getAllByTestId("timeline-aligned-row")
      .find((row) => row.getAttribute("data-time-ms") === "0");
    expect(zeroRow).toBeTruthy();
    expect(within(zeroRow!).getAllByText("Navigation start")).toHaveLength(2);
  });

  it("shows each moment's own time inside compare cards", () => {
    window.history.replaceState(null, "", "/?report=Mobile&report=Desktop");
    mockItems.current = [reportItem("Mobile"), reportItem("Desktop")];
    render(<PageLoadTimeline />);

    const aligned = screen.getByTestId("timeline-aligned-moments");
    const times = within(aligned).getAllByTestId("moment-time");
    expect(times.length).toBeGreaterThan(0);
    expect(times.some((time) => / – /.test(time.textContent ?? ""))).toBe(true);
  });

  it("lets multi-select pick any two A/B form-factor reports", () => {
    window.history.replaceState(null, "", "/");
    mockItems.current = [
      reportItem("A · Mobile"),
      reportItem("A · Desktop"),
      reportItem("B · Mobile"),
      reportItem("B · Desktop"),
    ];
    render(<PageLoadTimeline />);

    expect(screen.getByTestId("timeline-report-label")).toHaveTextContent(
      "A · Mobile vs B · Mobile",
    );
    fireEvent.click(screen.getByRole("button", { name: "A · Mobile" }));
    expect(screen.queryByTestId("timeline-compare")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "A · Desktop" }));
    fireEvent.click(screen.getByRole("button", { name: "B · Desktop" }));
    expect(screen.getByTestId("timeline-report-label")).toHaveTextContent(
      "A · Desktop vs B · Desktop",
    );
    expect(new URLSearchParams(window.location.search).getAll("report")).toEqual([
      "A · Desktop",
      "B · Desktop",
    ]);
  });

  it("shares the longer axis end across compare panes", () => {
    window.history.replaceState(null, "", "/");
    const short = reportItem("A · Mobile");
    const long = reportItem("B · Mobile");
    const longMetrics = long.item.lighthouseResult.audits.metrics.details.items[0] as Record<
      string,
      number
    >;
    longMetrics.interactive = 9000;
    longMetrics.observedTraceEnd = 10000;
    mockItems.current = [short, long];
    render(<PageLoadTimeline />);

    const compare = screen.getByTestId("timeline-compare");
    const shared = Number(compare.getAttribute("data-shared-axis-end-ms"));
    expect(shared).toBeGreaterThanOrEqual(10000);
    const panes = within(compare).getAllByTestId("timeline-pane");
    expect(panes).toHaveLength(2);
    for (const pane of panes) {
      const axis = pane.querySelector("[data-axis-end-ms]");
      expect(axis).toHaveAttribute("data-axis-end-ms", String(shared));
    }
  });

  it("keeps unprefixed moment ids in single-run mode", () => {
    window.history.replaceState(null, "", "/");
    mockItems.current = [reportItem("Mobile")];
    render(<PageLoadTimeline />);
    expect(document.getElementById("timeline-moment-sub-lcp")).toBeTruthy();
    expect(screen.queryByTestId("timeline-compare")).not.toBeInTheDocument();
  });
});
