import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  MetricValueViz,
  SUMMARY_ROWS_PER_RUN,
} from "@/features/page-speed-insights/MetricValueViz";
import type { CauseAuditEntry } from "@/features/page-speed-insights/metricCauseAudits";
import type { AuditResult } from "@/lib/schema";

function audit(partial: Partial<AuditResult> & Pick<AuditResult, "id" | "title">): AuditResult {
  return {
    score: 0.8,
    scoreDisplayMode: "numeric",
    ...partial,
  };
}

describe("MetricValueViz", () => {
  it("places a fast FCP on the good side of the lab thresholds", () => {
    const { container } = render(
      <MetricValueViz
        auditId="first-contentful-paint"
        causes={[]}
        sources={[{ label: "Mobile", audits: {} }]}
        auditItems={[
          {
            label: "Mobile",
            audit: audit({
              id: "first-contentful-paint",
              title: "First Contentful Paint",
              numericValue: 1200,
              displayValue: "1.2 s",
            }),
          },
        ]}
      />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain("Good");
    expect(text).toContain("1.2 s");
    expect(text).toContain("1.80 s");
    expect(text).toContain("3.00 s");
    expect(text).toContain("600 ms - Good");
  });

  it("draws LCP phases on a separate subparts track", () => {
    const { container } = render(
      <MetricValueViz
        auditId="largest-contentful-paint"
        causes={[]}
        sources={[
          {
            label: "Mobile",
            audits: {
              "lcp-breakdown-insight": audit({
                id: "lcp-breakdown-insight",
                title: "LCP breakdown",
                details: {
                  type: "list",
                  items: [
                    {
                      type: "table",
                      headings: [],
                      items: [
                        { subpart: "timeToFirstByte", label: "Time to first byte", duration: 400 },
                        {
                          subpart: "resourceLoadDelay",
                          label: "Resource load delay",
                          duration: 900,
                        },
                        {
                          subpart: "resourceLoadDuration",
                          label: "Resource load duration",
                          duration: 700,
                        },
                        {
                          subpart: "elementRenderDelay",
                          label: "Element render delay",
                          duration: 1800,
                        },
                      ],
                    },
                  ],
                },
              }),
            },
          },
        ]}
        auditItems={[
          {
            label: "Mobile",
            audit: audit({
              id: "largest-contentful-paint",
              title: "Largest Contentful Paint",
              numericValue: 3800,
              displayValue: "3.8 s",
            }),
          },
        ]}
      />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain("Average");
    expect(text).toContain("LCP subparts");
    expect(text).toContain("Time to first byte");
    expect(text).toContain("Element render delay");
    expect(text).toContain("1.80 s");
    expect(text).toContain("1.30 s - Average");
    expect(container.querySelector('[data-testid="lcp-phase-track"]')).toBeTruthy();
  });

  it("charts estimated savings against the measured value", () => {
    const cause: CauseAuditEntry = {
      auditId: "bootup-time",
      title: "JavaScript execution time",
      maxSavings: 350,
      entries: [
        {
          label: "Mobile",
          audit: audit({
            id: "bootup-time",
            title: "JavaScript execution time",
            metricSavings: { TBT: 350 },
            details: { type: "table", headings: [], items: [] },
          }),
        },
      ],
    };

    const { container } = render(
      <MetricValueViz
        auditId="total-blocking-time"
        causes={[cause]}
        sources={[{ label: "Mobile", audits: {} }]}
        auditItems={[
          {
            label: "Mobile",
            audit: audit({
              id: "total-blocking-time",
              title: "Total Blocking Time",
              numericValue: 480,
              displayValue: "480 ms",
            }),
          },
        ]}
      />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain("Average");
    expect(text).toContain("Estimated savings");
    expect(text).toContain("JavaScript execution time");
    expect(text).toContain("350 ms");
    expect(text).toContain("280 ms - Average");
  });

  it("rates CLS against 0.10 and 0.25", () => {
    const { container } = render(
      <MetricValueViz
        auditId="cumulative-layout-shift"
        causes={[]}
        sources={[{ label: "Mobile", audits: {} }]}
        auditItems={[
          {
            label: "Mobile",
            audit: audit({
              id: "cumulative-layout-shift",
              title: "Cumulative Layout Shift",
              numericValue: 0.42,
              displayValue: "0.42",
            }),
          },
        ]}
      />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain("Bad");
    expect(text).toContain("0.10");
    expect(text).toContain("0.25");
    expect(text).toContain("0.17 - Bad");
  });

  it("stacks devices in summary and places them side-by-side in detail", () => {
    const items = [
      {
        label: "Mobile",
        audit: audit({
          id: "first-contentful-paint",
          title: "First Contentful Paint",
          numericValue: 1200,
          displayValue: "1.2 s",
        }),
      },
      {
        label: "Desktop",
        audit: audit({
          id: "first-contentful-paint",
          title: "First Contentful Paint",
          numericValue: 400,
          displayValue: "0.4 s",
        }),
      },
    ];

    const summary = render(
      <MetricValueViz
        detail={false}
        auditId="first-contentful-paint"
        auditItems={items}
        causes={[]}
        sources={[]}
      />,
    );
    expect(
      summary.container.querySelector('[data-testid="metric-value-viz"] > div')?.className,
    ).toContain("flex-col");
    summary.unmount();

    const detail = render(
      <MetricValueViz
        auditId="first-contentful-paint"
        auditItems={items}
        causes={[]}
        sources={[]}
      />,
    );
    expect(
      detail.container.querySelector('[data-testid="metric-value-viz"] > div')?.className,
    ).toContain("grid-cols-2");
  });

  it("shows a run-to-run delta when compare labels are paired", () => {
    const { container } = render(
      <MetricValueViz
        detail={false}
        auditId="first-contentful-paint"
        auditItems={[
          {
            label: "A · Mobile",
            audit: audit({
              id: "first-contentful-paint",
              title: "First Contentful Paint",
              numericValue: 2000,
              displayValue: "2.0 s",
            }),
          },
          {
            label: "B · Mobile",
            audit: audit({
              id: "first-contentful-paint",
              title: "First Contentful Paint",
              numericValue: 1500,
              displayValue: "1.5 s",
            }),
          },
        ]}
        causes={[]}
        sources={[]}
      />,
    );

    expect(container.querySelector('[data-testid="metric-compare-delta"]')).toBeTruthy();
    expect(container.textContent).toContain("Δ -500 ms (A → B)");
  });

  it("keeps summary cards to the scale and the largest savings", () => {
    const { container } = render(
      <MetricValueViz
        detail={false}
        auditId="first-contentful-paint"
        causes={[
          {
            auditId: "render-blocking-insight",
            title: "Render blocking requests",
            maxSavings: 100,
            entries: [
              {
                label: "Mobile",
                audit: audit({
                  id: "render-blocking-insight",
                  title: "Render blocking requests",
                  metricSavings: { FCP: 100 },
                }),
              },
            ],
          },
        ]}
        sources={[
          {
            label: "Mobile",
            audits: {
              "lcp-breakdown-insight": audit({
                id: "lcp-breakdown-insight",
                title: "LCP breakdown",
                details: {
                  type: "list",
                  items: [
                    {
                      type: "table",
                      headings: [],
                      items: [
                        { subpart: "timeToFirstByte", label: "Time to first byte", duration: 400 },
                      ],
                    },
                  ],
                },
              }),
            },
          },
        ]}
        auditItems={[
          {
            label: "Mobile",
            audit: audit({
              id: "first-contentful-paint",
              title: "First Contentful Paint",
              numericValue: 1200,
              displayValue: "1.2 s",
            }),
          },
        ]}
      />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain("Good");
    expect(text).toContain("Up to 100 ms in estimated savings");
    expect(text).not.toContain("Estimated savings");
    expect(text).not.toContain("Time to first byte");
  });

  it("flattens each run into a fixed number of subgrid items", () => {
    const { container } = render(
      <MetricValueViz
        detail={false}
        subgrid
        auditId="total-blocking-time"
        auditItems={["Mobile", "Desktop"].map((label) => ({
          label,
          audit: audit({ id: "total-blocking-time", title: "TBT", numericValue: 0 }),
        }))}
      />,
    );

    const scales = container.querySelectorAll('[data-testid="metric-scale-total-blocking-time"]');
    expect(scales).toHaveLength(2);
    for (const scale of scales) {
      expect(scale.className).toBe("contents");
      expect(scale.children).toHaveLength(SUMMARY_ROWS_PER_RUN);
    }
  });
});
