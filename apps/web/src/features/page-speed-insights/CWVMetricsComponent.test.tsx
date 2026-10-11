import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScoreDisplayModes } from "@/features/page-speed-insights/ScoreDisplay";

let pageSpeedItems: unknown[] = [];

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: () => pageSpeedItems,
}));

vi.mock("@/components/common/PageSpeedGaugeChart", () => ({
  HorizontalScoreChart: ({ score }: { score: number }) => <div>Score chart: {score}</div>,
}));

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderNode", () => ({
  NodeComponent: ({ item, device }: { item: { nodeLabel?: string }; device: string }) => (
    <div data-testid="lcp-node">
      {device}: {item.nodeLabel}
    </div>
  ),
}));

vi.mock("@/features/page-speed-insights/MetricCauseCard", () => ({
  MetricCauseCard: ({
    cause,
    acronym,
  }: {
    cause: { auditId: string; title: string; maxSavings: number };
    acronym: string;
  }) => (
    <div data-testid={`cause-${cause.auditId}`}>
      {cause.title} ({acronym}) savings:{cause.maxSavings}
    </div>
  ),
}));

vi.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="chevron" />,
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
  }: {
    children?: React.ReactNode;
    type?: "single" | "multiple";
    defaultValue?: string | string[];
  }) => {
    const [internal, setInternal] = React.useState<string[]>(() =>
      Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : [],
    );
    return (
      <AccordionContext.Provider value={{ value: internal, onValueChange: setInternal, type }}>
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
      <div data-value={itemValue}>{children}</div>
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
    if (!ctx.value.includes(itemValue)) return null;
    return <div className={className}>{children}</div>;
  };

  return {
    Accordion: AccordionRoot,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
  };
});

import { Accordion } from "@/components/ui/accordion";
import { CWVMetricsComponent } from "@/features/page-speed-insights/CWVMetricsComponent";

function metricAudit(id: string, title: string, extras: Record<string, unknown> = {}) {
  return {
    id,
    title,
    description: `${title} description`,
    score: 0.8,
    scoreDisplayMode: ScoreDisplayModes.NUMERIC,
    displayValue: "1.0 s",
    ...extras,
  };
}

function causeAudit(id: string, title: string, metricSavings?: Record<string, number>) {
  return {
    id,
    title,
    description: `${title} help`,
    score: 0.5,
    scoreDisplayMode: "informative",
    metricSavings,
    details: { type: "table", headings: [], items: [{ url: "https://example.com" }] },
  };
}

describe("CWVMetricsComponent", () => {
  beforeEach(() => {
    pageSpeedItems = [];
  });

  it("returns null when there are no metric audits", () => {
    pageSpeedItems = [
      {
        label: "Mobile",
        item: { lighthouseResult: { audits: {} } },
      },
    ];

    const { container } = render(
      <Accordion type="multiple">
        <CWVMetricsComponent />
      </Accordion>,
    );

    expect(container.querySelector('[data-value="cwv"]')).toBeNull();
  });

  it("keeps Core Web Vitals Summary and adds cause sections when audits exist", async () => {
    pageSpeedItems = [
      {
        label: "Mobile",
        item: {
          lighthouseResult: {
            categoryGroups: { metrics: { title: "Metrics" } },
            audits: {
              "first-contentful-paint": metricAudit(
                "first-contentful-paint",
                "First Contentful Paint",
                { displayValue: "1.2 s" },
              ),
              "largest-contentful-paint": metricAudit(
                "largest-contentful-paint",
                "Largest Contentful Paint",
                { displayValue: "2.4 s" },
              ),
              "total-blocking-time": metricAudit("total-blocking-time", "Total Blocking Time", {
                displayValue: "300 ms",
              }),
              "cumulative-layout-shift": metricAudit(
                "cumulative-layout-shift",
                "Cumulative Layout Shift",
                { displayValue: "0.05" },
              ),
              "speed-index": metricAudit("speed-index", "Speed Index", { displayValue: "3.0 s" }),
              "lcp-breakdown-insight": causeAudit("lcp-breakdown-insight", "LCP breakdown", {
                LCP: 0,
              }),
              "bootup-time": causeAudit("bootup-time", "JavaScript execution time", { TBT: 200 }),
              "cls-culprits-insight": causeAudit("cls-culprits-insight", "Layout shift culprits", {
                CLS: 0.02,
              }),
              "render-blocking-insight": causeAudit(
                "render-blocking-insight",
                "Render blocking requests",
                { FCP: 100, LCP: 50 },
              ),
              "unused-css-rules": causeAudit("unused-css-rules", "Reduce unused CSS", { SI: 80 }),
            },
          },
        },
      },
    ];

    const { container } = render(
      <Accordion
        type="multiple"
        defaultValue={[
          "cwv",
          "cwv-cause-first-contentful-paint",
          "cwv-cause-largest-contentful-paint",
          "cwv-cause-total-blocking-time",
          "cwv-cause-cumulative-layout-shift",
          "cwv-cause-speed-index",
        ]}
      >
        <CWVMetricsComponent />
      </Accordion>,
    );

    expect(container.textContent).toContain("Core Web Vitals Summary");
    expect(container.querySelector('[data-value="cwv"]')).not.toBeNull();

    expect(
      container.querySelector('[data-value="cwv-cause-first-contentful-paint"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-value="cwv-cause-largest-contentful-paint"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-value="cwv-cause-total-blocking-time"]')).not.toBeNull();
    expect(
      container.querySelector('[data-value="cwv-cause-cumulative-layout-shift"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-value="cwv-cause-speed-index"]')).not.toBeNull();

    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="cause-lcp-breakdown-insight"]')?.textContent,
      ).toContain("LCP breakdown");
    });
    expect(container.querySelector('[data-testid="cause-bootup-time"]')?.textContent).toContain(
      "TBT",
    );
    expect(container.querySelector('[data-testid="cause-cls-culprits-insight"]')).not.toBeNull();
    expect(
      container.querySelector('[data-testid="cause-unused-css-rules"]')?.textContent,
    ).toContain("SI");
    expect(
      container.querySelector('[data-testid="cause-render-blocking-insight"]')?.textContent,
    ).toContain("FCP");
  });

  it("hides a metric cause section when it has no cause cards", () => {
    pageSpeedItems = [
      {
        label: "Mobile",
        item: {
          lighthouseResult: {
            categoryGroups: { metrics: { title: "Metrics" } },
            audits: {
              "first-contentful-paint": metricAudit(
                "first-contentful-paint",
                "First Contentful Paint",
              ),
              "largest-contentful-paint": metricAudit(
                "largest-contentful-paint",
                "Largest Contentful Paint",
              ),
              "total-blocking-time": metricAudit("total-blocking-time", "Total Blocking Time"),
              "cumulative-layout-shift": metricAudit(
                "cumulative-layout-shift",
                "Cumulative Layout Shift",
              ),
              "speed-index": metricAudit("speed-index", "Speed Index"),
              "lcp-breakdown-insight": causeAudit("lcp-breakdown-insight", "LCP breakdown", {
                LCP: 0,
              }),
            },
          },
        },
      },
    ];

    const { container } = render(
      <Accordion type="multiple" defaultValue={["cwv", "cwv-cause-largest-contentful-paint"]}>
        <CWVMetricsComponent />
      </Accordion>,
    );

    expect(container.querySelector('[data-value="cwv"]')).not.toBeNull();
    expect(
      container.querySelector('[data-value="cwv-cause-largest-contentful-paint"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-value="cwv-cause-first-contentful-paint"]')).toBeNull();
    expect(container.querySelector('[data-value="cwv-cause-total-blocking-time"]')).toBeNull();
  });

  it("shows display values on the cause section trigger", async () => {
    pageSpeedItems = [
      {
        label: "Mobile",
        item: {
          lighthouseResult: {
            categoryGroups: { metrics: { title: "Metrics" } },
            audits: {
              "largest-contentful-paint": metricAudit(
                "largest-contentful-paint",
                "Largest Contentful Paint",
                { displayValue: "2.4 s" },
              ),
              "first-contentful-paint": metricAudit(
                "first-contentful-paint",
                "First Contentful Paint",
              ),
              "total-blocking-time": metricAudit("total-blocking-time", "Total Blocking Time"),
              "cumulative-layout-shift": metricAudit(
                "cumulative-layout-shift",
                "Cumulative Layout Shift",
              ),
              "speed-index": metricAudit("speed-index", "Speed Index"),
              "lcp-breakdown-insight": causeAudit("lcp-breakdown-insight", "LCP breakdown"),
            },
          },
        },
      },
    ];

    const { container } = render(
      <Accordion type="multiple">
        <CWVMetricsComponent />
      </Accordion>,
    );

    const lcpSection = container.querySelector('[data-value="cwv-cause-largest-contentful-paint"]');
    expect(lcpSection?.textContent).toContain("Largest Contentful Paint");
    expect(lcpSection?.textContent).toContain("2.4 s");

    const trigger = lcpSection?.querySelector("button");
    expect(trigger).not.toBeNull();
    fireEvent.click(trigger!);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="cause-lcp-breakdown-insight"]')).not.toBeNull();
    });
  });

  it("shows the LCP element before other LCP cause cards", async () => {
    pageSpeedItems = [
      {
        label: "Mobile",
        item: {
          lighthouseResult: {
            categoryGroups: { metrics: { title: "Metrics" } },
            audits: {
              "largest-contentful-paint": metricAudit(
                "largest-contentful-paint",
                "Largest Contentful Paint",
                { displayValue: "4.8 s" },
              ),
              "lcp-breakdown-insight": {
                ...causeAudit("lcp-breakdown-insight", "LCP breakdown", { LCP: 0 }),
                details: {
                  type: "list",
                  items: [
                    { type: "table", headings: [], items: [] },
                    {
                      type: "node",
                      lhId: "page-0-H1",
                      nodeLabel: "Hero headline",
                      snippet: "<h1>",
                    },
                  ],
                },
              },
              "render-blocking-insight": causeAudit(
                "render-blocking-insight",
                "Render blocking requests",
                { LCP: 50 },
              ),
            },
          },
        },
      },
    ];

    const { container } = render(
      <Accordion type="multiple" defaultValue={["cwv-cause-largest-contentful-paint"]}>
        <CWVMetricsComponent />
      </Accordion>,
    );

    const section = container.querySelector('[data-value="cwv-cause-largest-contentful-paint"]');
    const element = section?.querySelector('[data-testid="lcp-element"]');
    expect(element?.textContent).toContain("Hero headline");
    await waitFor(() => {
      expect(section?.querySelector('[data-testid="cause-lcp-breakdown-insight"]')).not.toBeNull();
    });
    const breakdown = section?.querySelector('[data-testid="cause-lcp-breakdown-insight"]');
    expect(
      element!.compareDocumentPosition(breakdown!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows the filmstrip frame nearest FCP before other FCP cause cards", async () => {
    pageSpeedItems = [
      {
        label: "Mobile",
        item: {
          lighthouseResult: {
            categoryGroups: { metrics: { title: "Metrics" } },
            audits: {
              "first-contentful-paint": metricAudit(
                "first-contentful-paint",
                "First Contentful Paint",
                { numericValue: 1200, displayValue: "1.2 s" },
              ),
              "screenshot-thumbnails": {
                id: "screenshot-thumbnails",
                title: "Screenshot Thumbnails",
                score: 1,
                scoreDisplayMode: "informative",
                details: {
                  type: "filmstrip",
                  scale: 1,
                  items: [
                    { data: "data:image/jpeg;base64,blank", timing: 200, timestamp: 200 },
                    { data: "data:image/jpeg;base64,paint", timing: 1100, timestamp: 1100 },
                  ],
                },
              },
              "render-blocking-insight": causeAudit(
                "render-blocking-insight",
                "Render blocking requests",
                { FCP: 100 },
              ),
            },
          },
        },
      },
    ];

    const { container } = render(
      <Accordion type="multiple" defaultValue={["cwv-cause-first-contentful-paint"]}>
        <CWVMetricsComponent />
      </Accordion>,
    );

    const section = container.querySelector('[data-value="cwv-cause-first-contentful-paint"]');
    const screenshot = section?.querySelector('[data-testid="fcp-screenshot"]');
    const image = screenshot?.querySelector("img");

    expect(screenshot?.textContent).toContain("Screenshot at FCP");
    expect(image).toHaveAttribute("src", "data:image/jpeg;base64,paint");
    await waitFor(() => {
      expect(
        section?.querySelector('[data-testid="cause-render-blocking-insight"]'),
      ).not.toBeNull();
    });
    const cause = section?.querySelector('[data-testid="cause-render-blocking-insight"]');
    expect(
      screenshot!.compareDocumentPosition(cause!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
