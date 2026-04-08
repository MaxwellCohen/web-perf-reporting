import React from "react";

import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Accordion } from "@/components/ui/accordion";
import {
  mapItemsToNetworkMetrics,
  mapNetworkMetricsToStats,
} from "@/features/page-speed-insights/network-metrics/useNetworkMetricsData";

vi.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="chevron" />,
  ListFilter: () => <span data-testid="list-filter" />,
  ArrowUp: () => <span data-testid="arrow-up" />,
  ChevronRightIcon: () => <span data-testid="chevron-right" />,
  MinusIcon: () => <span data-testid="minus" />,
  Copy: () => <span data-testid="copy" />,
}));

vi.mock("@/components/ui/accordion", () => {
  const AccordionContext = React.createContext<{
    value: string[];
    onValueChange: (v: string[]) => void;
    type: "single" | "multiple";
  }>({ value: [], onValueChange: () => {}, type: "multiple" });
  const ItemValueContext = React.createContext<string>("");

  const AccordionRoot = ({
    children,
    type = "multiple",
    defaultValue,
    value,
    onValueChange,
  }: {
    children?: React.ReactNode;
    type?: "single" | "multiple";
    defaultValue?: string | string[];
    value?: string | string[];
    onValueChange?: (v: string | string[]) => void;
  }) => {
    const [internal, setInternal] = React.useState<string[]>(() =>
      Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : [],
    );
    const val = value !== undefined ? (Array.isArray(value) ? value : [value]) : internal;
    const setVal = (v: string[]) => {
      if (value === undefined) setInternal(v);
      onValueChange?.(type === "single" ? (v[0] ?? "") : v);
    };
    return (
      <AccordionContext.Provider value={{ value: val, onValueChange: setVal, type }}>
        <div data-accordion>{children}</div>
      </AccordionContext.Provider>
    );
  };

  const AccordionItem = ({
    children,
    value: itemValue,
  }: {
    children?: React.ReactNode;
    value: string;
  }) => (
    <ItemValueContext.Provider value={itemValue}>
      <div data-accordion-item={itemValue} data-value={itemValue}>
        {children}
      </div>
    </ItemValueContext.Provider>
  );

  const AccordionTrigger = ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => {
    const ctx = React.useContext(AccordionContext);
    const itemValue = React.useContext(ItemValueContext);
    return (
      <button
        type="button"
        className={className}
        onClick={() => {
          const isOpen = ctx.value.includes(itemValue);
          const next = isOpen
            ? ctx.value.filter((x) => x !== itemValue)
            : ctx.type === "single"
              ? [itemValue]
              : [...ctx.value, itemValue];
          ctx.onValueChange(next);
        }}
      >
        {children}
      </button>
    );
  };

  const AccordionContent = ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => {
    const ctx = React.useContext(AccordionContext);
    const itemValue = React.useContext(ItemValueContext);
    const isOpen = ctx.value.includes(itemValue);
    if (!isOpen) return null;
    return <div className={className}>{children}</div>;
  };

  return {
    Accordion: AccordionRoot,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
  };
});

let pageSpeedItems: any[] = [];
const analyzeAuditsMock = vi.fn();
const extractJSMetricsMock = vi.fn();

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: () => pageSpeedItems,
  usePageSpeedSelector: (selector: (snapshot: { context: unknown }) => unknown) => {
    const networkMetricSeries = mapItemsToNetworkMetrics(pageSpeedItems);
    return selector({
      context: {
        items: pageSpeedItems,
        networkMetricSeries,
        networkRequestStats: mapNetworkMetricsToStats(networkMetricSeries),
        data: [],
        labels: [],
        isLoading: false,
        reportTitle: "",
        fullPageScreenshots: {},
      },
    });
  },
}));

vi.mock(
  "@/features/page-speed-insights/javascript-metrics/javascriptMetricsSelectors",
  async (importOriginal) => {
    const { selectJavaScriptMetrics } =
      (await importOriginal()) as typeof import("@/features/page-speed-insights/javascript-metrics/javascriptMetricsSelectors");
    return {
      selectJavaScriptMetrics,
      useJavaScriptMetrics: () => selectJavaScriptMetrics({ context: { items: pageSpeedItems } }),
    };
  },
);

vi.mock("@/components/common/PageSpeedGaugeChart", () => ({
  HorizontalGaugeChart: ({ metric }: { metric: string }) => <div>{metric}</div>,
  HorizontalScoreChart: ({ score }: { score: number }) => <div>Score chart: {score}</div>,
}));

vi.mock("@/features/page-speed-insights/network-metrics/NetworkRequestsSummaryCard", () => ({
  NetworkRequestsSummaryCard: () => {
    const stats = mapNetworkMetricsToStats(mapItemsToNetworkMetrics(pageSpeedItems));
    return <div>Network summary: {stats.map((stat) => stat.totalRequests).join(",")}</div>;
  },
}));

vi.mock("@/features/page-speed-insights/network-metrics/TimingMetricsCard", () => ({
  TimingMetricsCard: () => {
    const series = mapItemsToNetworkMetrics(pageSpeedItems);
    return <div>Timing metrics: {series.map((metric) => metric.ttfb).join(",")}</div>;
  },
}));

vi.mock("@/features/page-speed-insights/network-metrics/TimelineCard", () => ({
  TimelineCard: () => {
    const series = mapItemsToNetworkMetrics(pageSpeedItems);
    return (
      <div>Timeline metrics: {series.map((metric) => metric.observedFirstPaint).join(",")}</div>
    );
  },
}));

vi.mock("@/features/page-speed-insights/network-metrics/LCPBreakdownCard", () => ({
  LCPBreakdownCard: () => <div>LCP breakdown count: {pageSpeedItems.length}</div>,
}));

vi.mock("@/features/page-speed-insights/network-metrics/NetworkRTTCard", () => ({
  NetworkRTTCard: () => {
    const series = mapItemsToNetworkMetrics(pageSpeedItems);
    return <div>RTT metrics: {series.map((metric) => metric.networkRTT.length).join(",")}</div>;
  },
}));

vi.mock("@/features/page-speed-insights/network-metrics/ServerLatencyCard", () => ({
  ServerLatencyCard: () => {
    const series = mapItemsToNetworkMetrics(pageSpeedItems);
    return (
      <div>Server metrics: {series.map((metric) => metric.serverLatency.length).join(",")}</div>
    );
  },
}));

vi.mock("@/features/page-speed-insights/network-metrics/ResourceTypeBreakdownCard", () => ({
  ResourceTypeBreakdownCard: () => {
    const stats = mapNetworkMetricsToStats(mapItemsToNetworkMetrics(pageSpeedItems));
    return (
      <div>
        Resource types:{" "}
        {stats.map((stat) => Object.keys(stat.byResourceType).sort().join("|")).join(",")}
      </div>
    );
  },
}));

vi.mock("@/features/page-speed-insights/network-metrics/TopResourcesCard", () => ({
  TopResourcesCard: () => {
    const stats = mapNetworkMetricsToStats(mapItemsToNetworkMetrics(pageSpeedItems));
    return (
      <div>Top resources: {stats.map((stat) => stat.topResources[0]?.url ?? "none").join(",")}</div>
    );
  },
}));

vi.mock("@/features/page-speed-insights/javascript-metrics/JavaScriptSummaryCard", () => ({
  JavaScriptSummaryCard: ({
    stats,
  }: {
    stats: Array<{ totalScripts: number; totalTransferSize: number }>;
  }) => (
    <div>
      JavaScript summary:{" "}
      {stats.map((stat) => `${stat.totalScripts}/${stat.totalTransferSize}`).join(",")}
    </div>
  ),
}));

vi.mock("@/features/page-speed-insights/javascript-metrics/TaskSummaryCard", () => ({
  TaskSummaryCard: ({
    metrics,
  }: {
    metrics: Array<{ diagnostics: unknown[]; mainThreadTasks: unknown[] }>;
  }) => (
    <div>
      Task summary:{" "}
      {metrics
        .map((metric) => `${metric.diagnostics.length}/${metric.mainThreadTasks.length}`)
        .join(",")}
    </div>
  ),
}));

vi.mock("@/features/page-speed-insights/javascript-metrics/BootupTimeCard", () => ({
  BootupTimeCard: ({ metrics }: { metrics: Array<{ bootupTime: unknown[] }> }) => (
    <div>Bootup metrics: {metrics.map((metric) => metric.bootupTime.length).join(",")}</div>
  ),
}));

vi.mock("@/features/page-speed-insights/javascript-metrics/MainThreadWorkCard", () => ({
  MainThreadWorkCard: ({ metrics }: { metrics: Array<{ mainThreadWork: unknown[] }> }) => (
    <div>Main thread work: {metrics.map((metric) => metric.mainThreadWork.length).join(",")}</div>
  ),
}));

vi.mock("@/features/page-speed-insights/javascript-metrics/UnusedJavaScriptCard", () => ({
  UnusedJavaScriptCard: ({ metrics }: { metrics: Array<{ unusedJS: unknown[] }> }) => (
    <div>Unused JS: {metrics.map((metric) => metric.unusedJS.length).join(",")}</div>
  ),
}));

vi.mock("@/features/page-speed-insights/javascript-metrics/UnminifiedJavaScriptCard", () => ({
  UnminifiedJavaScriptCard: ({ metrics }: { metrics: Array<{ unminifiedJS: unknown[] }> }) => (
    <div>Unminified JS: {metrics.map((metric) => metric.unminifiedJS.length).join(",")}</div>
  ),
}));

vi.mock("@/features/page-speed-insights/javascript-metrics/LegacyJavaScriptCard", () => ({
  LegacyJavaScriptCard: ({ metrics }: { metrics: Array<{ legacyJS: unknown[] }> }) => (
    <div>Legacy JS: {metrics.map((metric) => metric.legacyJS.length).join(",")}</div>
  ),
}));

vi.mock("@/features/page-speed-insights/javascript-metrics/extractJSMetrics", () => ({
  extractJSMetrics: (item: unknown) => extractJSMetricsMock(item),
}));

vi.mock("@/features/page-speed-insights/RecommendationsSection/analyzeAudits", () => ({
  analyzeAudits: (items: unknown[]) => analyzeAuditsMock(items),
  hasDetails: (recommendation: { details?: unknown[] }) =>
    (recommendation.details?.length ?? 0) > 0,
}));

vi.mock("@/features/page-speed-insights/RecommendationsSection/FilterControls", () => ({
  FilterControls: ({
    filteredCount,
    totalCount,
    expandedCount,
    onToggleAll,
  }: {
    filteredCount: number;
    totalCount: number;
    expandedCount: number;
    onToggleAll: () => void;
  }) => (
    <div>
      <div>
        Filter summary: {filteredCount}/{totalCount}
      </div>
      <div>Expanded count: {expandedCount}</div>
      <button type="button" onClick={onToggleAll}>
        Toggle all
      </button>
    </div>
  ),
}));

vi.mock("@/features/page-speed-insights/RecommendationsSection/RecommendationItem", () => ({
  RecommendationItem: ({ rec }: { rec: { id: string; title: string } }) => <div>{rec.title}</div>,
}));

import { CWVMetricsComponent } from "@/features/page-speed-insights/CWVMetricsComponent";
import { JavaScriptPerformanceComponent } from "@/features/page-speed-insights/javascript-metrics/JavaScriptPerformanceComponent";
import { LoadingExperience } from "@/features/page-speed-insights/loading-experience";
import { NetworkMetricsComponent } from "@/features/page-speed-insights/network-metrics";
import { RecommendationsSection } from "@/features/page-speed-insights/RecommendationsSection/RecommendationsSection";
import {
  ScoreDisplay,
  ScoreDisplayModes,
  isEmptyResult,
  sortByScoreDisplayModes,
} from "@/features/page-speed-insights/ScoreDisplay";

describe("page-speed container coverage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pageSpeedItems = [];
    analyzeAuditsMock.mockReset();
    extractJSMetricsMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when LoadingExperience has no items", () => {
    pageSpeedItems = [];

    const { container } = render(
      <Accordion type="multiple">
        <LoadingExperience title="Page Loading Experience" experienceKey="loadingExperience" />
      </Accordion>,
    );

    expect(container.querySelector('[value="loadingExperience"]')).toBeNull();
  });

  it("returns null when LoadingExperience items have no experience data", () => {
    pageSpeedItems = [
      { label: "Mobile", item: {} },
      { label: "Desktop", item: { lighthouseResult: {} } },
    ];

    const { container } = render(
      <Accordion type="multiple">
        <LoadingExperience title="Page Loading Experience" experienceKey="loadingExperience" />
      </Accordion>,
    );

    expect(container.querySelector('[value="loadingExperience"]')).toBeNull();
  });

  it("renders the loading experience gauges for available metrics", () => {
    pageSpeedItems = [
      {
        label: "Mobile",
        item: {
          loadingExperience: {
            overall_category: "FAST",
            metrics: {
              FIRST_CONTENTFUL_PAINT_MS: {
                percentile: 1200,
                category: "FAST",
              },
              LARGEST_CONTENTFUL_PAINT_MS: {
                percentile: 2200,
                category: "AVERAGE",
              },
            },
          },
        },
      },
    ];

    const { container } = render(
      <Accordion type="multiple" defaultValue={["loadingExperience"]}>
        <LoadingExperience title="Page Loading Experience" experienceKey="loadingExperience" />
      </Accordion>,
    );

    expect(container.textContent).toMatch(/Page Loading Experience: Mobile - FAST/);
    expect(container.textContent).toContain("1200 - FAST (Mobile)");
    expect(container.textContent).toContain("2200 - AVERAGE (Mobile)");
  });

  it("returns null when no items have metric audits", () => {
    pageSpeedItems = [
      {
        label: "Mobile",
        item: {
          lighthouseResult: {
            audits: {},
          },
        },
      },
    ];

    const { container } = render(
      <Accordion type="multiple">
        <CWVMetricsComponent />
      </Accordion>,
    );

    expect(container.querySelector('[value="cwv"]')).toBeNull();
  });

  it("returns null when network items is empty", () => {
    pageSpeedItems = [];

    const { container } = render(
      <Accordion type="multiple">
        <NetworkMetricsComponent />
      </Accordion>,
    );

    expect(container.querySelector('[value="networkMetrics"]')).toBeNull();
  });

  it("renders the cwv summary cards when audits are available", () => {
    pageSpeedItems = [
      {
        label: "Mobile",
        item: {
          lighthouseResult: {
            categoryGroups: { metrics: { title: "Metrics" } },
            audits: {
              "first-contentful-paint": {
                title: "First Contentful Paint",
                description: "FCP description",
                score: 0.92,
                scoreDisplayMode: ScoreDisplayModes.NUMERIC,
                displayValue: "1.2 s",
              },
              "largest-contentful-paint": {
                title: "Largest Contentful Paint",
                description: "LCP description",
                score: 1,
                scoreDisplayMode: ScoreDisplayModes.BINARY,
              },
              "total-blocking-time": {
                title: "Total Blocking Time",
                description: "TBT description",
                score: null,
                scoreDisplayMode: ScoreDisplayModes.INFORMATIVE,
              },
              "cumulative-layout-shift": {
                title: "Cumulative Layout Shift",
                description: "CLS description",
                score: 0,
                scoreDisplayMode: ScoreDisplayModes.ERROR,
                errorMessage: "Failed",
              },
              "speed-index": {
                title: "Speed Index",
                description: "Speed index description",
                score: 0.5,
                scoreDisplayMode: ScoreDisplayModes.MANUAL,
              },
            },
          },
        },
      },
    ];

    const { container } = render(
      <Accordion type="multiple" defaultValue={["cwv"]}>
        <CWVMetricsComponent />
      </Accordion>,
    );

    expect(container.textContent).toContain("Core Web Vitals Summary");
    expect(container.textContent).toContain("First Contentful Paint");
    expect(container.textContent).toMatch(/Score: 92 \/ 100/);
    expect(container.textContent).toContain("Mobile - ✅ - Passed");
    expect(container.textContent).toContain("Error: Failed");
    expect(container.textContent).toContain("Mobile - Manual");
    expect((container.textContent?.match(/Score chart:/g) ?? []).length).toBe(5);
  });

  it("aggregates network metrics before rendering the child cards", () => {
    pageSpeedItems = [
      {
        label: "Mobile",
        item: {
          lighthouseResult: {
            audits: {
              metrics: {
                details: {
                  items: [
                    {
                      timeToFirstByte: 100,
                      observedFirstPaint: 150,
                      firstContentfulPaint: 250,
                      largestContentfulPaint: 1200,
                      speedIndex: 900,
                      totalBlockingTime: 50,
                      observedDomContentLoaded: 400,
                      observedLoad: 700,
                      interactive: 800,
                      observedNavigationStart: 10,
                      observedFirstContentfulPaint: 250,
                      observedLargestContentfulPaint: 1200,
                      observedFirstContentfulPaintAllFrames: 260,
                      observedFirstVisualChange: 275,
                      observedLargestContentfulPaintAllFrames: 1250,
                      observedLastVisualChange: 1300,
                      observedTraceEnd: 1500,
                    },
                  ],
                },
              },
              "network-requests": {
                details: {
                  items: [
                    {
                      url: "https://cdn.example.com/app.js",
                      transferSize: 300,
                      resourceSize: 500,
                      resourceType: "Script",
                    },
                    {
                      url: "https://cdn.example.com/app.css",
                      transferSize: 100,
                      resourceSize: 150,
                      resourceType: "Stylesheet",
                    },
                  ],
                },
              },
              "network-rtt": { details: { items: [{ origin: "self", rtt: 90 }] } },
              "network-server-latency": {
                details: { items: [{ origin: "self", latency: 40 }] },
              },
            },
          },
        },
      },
    ];

    const { container } = render(
      <Accordion type="multiple" defaultValue={["networkMetrics"]}>
        <NetworkMetricsComponent />
      </Accordion>,
    );

    expect(container.textContent).toContain("Network summary: 2");
    expect(container.textContent).toContain("Timing metrics: 100");
    expect(container.textContent).toContain("Timeline metrics: 150");
    expect(container.textContent).toContain("LCP breakdown count: 1");
    expect(container.textContent).toContain("RTT metrics: 1");
    expect(container.textContent).toContain("Server metrics: 1");
    expect(container.textContent).toContain("Resource types: Script|Stylesheet");
    expect(container.textContent).toContain("Top resources: https://cdn.example.com/app.js");
  });

  it("builds javascript metric summaries from extracted resources", () => {
    pageSpeedItems = [
      { label: "Mobile", item: { id: 1 } },
      { label: "Desktop", item: { id: 2 } },
    ];
    extractJSMetricsMock.mockImplementation((item: { label: string }) => {
      if (item.label === "Mobile") {
        return {
          label: "Mobile",
          jsResources: [{ transferSize: 10, resourceSize: 20 }],
          diagnostics: [{ numTasks: 2 }],
          mainThreadTasks: [{ duration: 10 }, { duration: 20 }],
          bootupTime: [{ duration: 15 }],
          mainThreadWork: [{ duration: 30 }],
          unusedJS: [{ wastedBytes: 10 }],
          unminifiedJS: [{ wastedBytes: 5 }],
          legacyJS: [{ signal: "legacy" }],
        };
      }

      return {
        label: "Desktop",
        jsResources: [],
        diagnostics: [],
        mainThreadTasks: [],
        bootupTime: [],
        mainThreadWork: [],
        unusedJS: [],
        unminifiedJS: [],
        legacyJS: [],
      };
    });

    const { container } = render(
      <Accordion type="multiple" defaultValue={["javascriptPerformance"]}>
        <JavaScriptPerformanceComponent />
      </Accordion>,
    );

    expect(container.textContent).toContain("JavaScript summary: 1/10,0/0");
    expect(container.textContent).toContain("Task summary: 1/2,0/0");
    expect(container.textContent).toContain("Bootup metrics: 1,0");
    expect(container.textContent).toContain("Main thread work: 1,0");
    expect(container.textContent).toContain("Unused JS: 1,0");
    expect(container.textContent).toContain("Unminified JS: 1,0");
    expect(container.textContent).toContain("Legacy JS: 1,0");
  });

  it("filters recommendation items down to entries with details and toggles expansion", () => {
    pageSpeedItems = [{ label: "Mobile", item: { lighthouseResult: {} } }];
    analyzeAuditsMock.mockReturnValue([
      {
        id: "rec-1",
        title: "Compress images",
        category: "Images",
        priority: "high",
        details: [{ text: "detail" }],
      },
      {
        id: "rec-2",
        title: "Inline critical CSS",
        category: "CSS",
        priority: "medium",
        details: [{ text: "detail" }],
      },
      {
        id: "rec-3",
        title: "Drop empty recommendation",
        category: "Other",
        priority: "low",
        details: [],
      },
    ]);

    const { container } = render(
      <Accordion type="multiple" defaultValue={["recommendations"]}>
        <RecommendationsSection />
      </Accordion>,
    );

    expect(container.textContent).toContain("Recommendations");
    expect(container.textContent).toContain("Filter summary: 2/2");
    expect(container.textContent).toContain("Compress images");
    expect(container.textContent).toContain("Inline critical CSS");
    expect(container.textContent).not.toContain("Drop empty recommendation");
    expect(container.textContent).toContain("Expanded count: 0");

    const toggleBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Toggle all",
    );
    fireEvent.click(toggleBtn!);

    expect(container.textContent).toContain("Expanded count: 2");
  });

  it("handles score display edge cases and audit sorting helpers", () => {
    const informativeAudit = {
      score: null,
      scoreDisplayMode: ScoreDisplayModes.INFORMATIVE,
    };
    const numericAudit = {
      score: 0.9,
      scoreDisplayMode: ScoreDisplayModes.NUMERIC,
      displayValue: "900 ms",
      details: { type: "table", items: [{ url: "https://example.com" }] },
    };
    const emptyAudit = {
      score: 1,
      scoreDisplayMode: ScoreDisplayModes.NUMERIC,
      details: { type: "table", items: [] },
    };

    const { container } = render(<ScoreDisplay audit={numericAudit as any} device="Mobile" />);

    expect(container.textContent).toMatch(/Mobile - 900 ms - Score: 90 \/ 100/);
    expect(isEmptyResult(undefined)).toBe(true);
    expect(isEmptyResult(emptyAudit as any)).toBe(true);
    expect(isEmptyResult(numericAudit as any)).toBe(false);
    expect(sortByScoreDisplayModes(emptyAudit as any, numericAudit as any)).toBeGreaterThan(0);
    expect(sortByScoreDisplayModes(undefined, informativeAudit as any)).toBe(-1);
  });
});
