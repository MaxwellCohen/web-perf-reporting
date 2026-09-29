import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CauseAuditEntry } from "@/features/page-speed-insights/metricCauseAudits";

vi.mock("@/features/page-speed-insights/lh-categories/RenderDetails", () => ({
  RenderDetails: ({ items }: { items: Array<{ auditResult: { id: string } }> }) => (
    <div data-testid="render-details">{items.map((i) => i.auditResult.id).join(",")}</div>
  ),
}));

vi.mock("@/components/ui/accordion", () => ({
  Accordion: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children?: string }) => <span>{children}</span>,
}));

import { MetricCauseCard } from "@/features/page-speed-insights/MetricCauseCard";

describe("MetricCauseCard", () => {
  it("renders title, savings, description, and audit details", () => {
    const cause: CauseAuditEntry = {
      auditId: "bootup-time",
      title: "JavaScript execution time",
      description: "Reduce JS execution",
      maxSavings: 350,
      entries: [
        {
          label: "Mobile",
          audit: {
            id: "bootup-time",
            title: "JavaScript execution time",
            description: "Reduce JS execution",
            score: 0.2,
            scoreDisplayMode: "metricSavings",
            metricSavings: { TBT: 350 },
            details: { type: "table", headings: [], items: [] },
          },
        },
      ],
    };

    const { container } = render(<MetricCauseCard cause={cause} acronym="TBT" />);

    expect(container.textContent).toContain("JavaScript execution time");
    expect(container.textContent).toContain("Est. savings: 350 ms TBT");
    expect(container.textContent).toContain("Reduce JS execution");
    expect(container.querySelector('[data-testid="render-details"]')?.textContent).toBe(
      "bootup-time",
    );
    expect(container.textContent).not.toContain("Possible Metric Savings");
  });

  it("formats CLS savings without ms", () => {
    const cause: CauseAuditEntry = {
      auditId: "cls-culprits-insight",
      title: "Layout shift culprits",
      maxSavings: 0.12,
      entries: [
        {
          label: "Mobile",
          audit: {
            id: "cls-culprits-insight",
            title: "Layout shift culprits",
            score: 1,
            scoreDisplayMode: "informative",
            metricSavings: { CLS: 0.12 },
            details: { type: "list", items: [] },
          },
        },
      ],
    };

    const { container } = render(<MetricCauseCard cause={cause} acronym="CLS" />);
    expect(container.textContent).toContain("Est. savings: 0.120 CLS");
  });

  it("summarizes main-thread tasks instead of listing every task", () => {
    const cause: CauseAuditEntry = {
      auditId: "main-thread-tasks",
      title: "Tasks",
      description: "Lists the toplevel main thread tasks that executed during page load.",
      maxSavings: 0,
      entries: [
        {
          label: "Mobile",
          audit: {
            id: "main-thread-tasks",
            title: "Tasks",
            description: "Lists the toplevel main thread tasks that executed during page load.",
            score: 1,
            scoreDisplayMode: "informative",
            details: {
              type: "table",
              headings: [],
              items: [
                { startTime: 100, duration: 20 },
                { startTime: 200, duration: 80 },
              ],
            },
          },
        },
      ],
    };

    const { container } = render(<MetricCauseCard cause={cause} acronym="TBT" />);

    expect(container.textContent).toContain("Main-thread tasks");
    expect(container.textContent).toContain("Blocking time");
    expect(container.textContent).toContain("30 ms");
    expect(container.textContent).not.toContain("Lists the toplevel main thread tasks");
    expect(container.querySelector('[data-testid="render-details"]')).toBeNull();
  });

  it("lists the scripts Lighthouse attributed to long tasks", () => {
    const cause: CauseAuditEntry = {
      auditId: "main-thread-tasks",
      title: "Tasks",
      maxSavings: 0,
      entries: [
        {
          label: "Mobile",
          audit: {
            id: "main-thread-tasks",
            title: "Tasks",
            score: 1,
            scoreDisplayMode: "informative",
            details: {
              type: "table",
              headings: [],
              items: [{ startTime: 200, duration: 80 }],
            },
          },
        },
      ],
    };

    const { container } = render(
      <MetricCauseCard
        cause={cause}
        acronym="TBT"
        sources={[
          {
            label: "Mobile",
            audits: {
              "long-tasks": {
                id: "long-tasks",
                title: "Avoid long main-thread tasks",
                score: 1,
                scoreDisplayMode: "informative",
                details: {
                  type: "table",
                  headings: [],
                  items: [
                    {
                      url: "https://cdn.example/static/chunks/app.js",
                      duration: 120,
                      startTime: 10,
                    },
                    { url: "Unattributable", duration: 70, startTime: 20 },
                  ],
                },
              },
            },
          },
        ]}
      />,
    );

    expect(container.textContent).toContain("app.js");
    expect(container.textContent).toContain("Unattributable");
    expect(container.textContent).toContain("70 ms");
    expect(container.querySelector('a[href="https://cdn.example/static/chunks/app.js"]')).not.toBeNull();
  });

  it("lists each image once with its delivery changes", () => {
    const cause: CauseAuditEntry = {
      auditId: "image-delivery-insight",
      title: "Improve image delivery",
      description: "Reducing the download time of images",
      maxSavings: 1300,
      entries: [
        {
          label: "Mobile",
          audit: {
            id: "image-delivery-insight",
            title: "Improve image delivery",
            description: "Reducing the download time of images",
            score: 0.5,
            scoreDisplayMode: "metricSavings",
            metricSavings: { LCP: 1300 },
            details: {
              type: "table",
              headings: [],
              items: [
                {
                  url: "https://images.example/cover.jpg",
                  totalBytes: 100000,
                  wastedBytes: 80000,
                  subItems: {
                    type: "subitems",
                    items: [
                      {
                        reason:
                          "Using a modern image format (WebP, AVIF) or increasing the image compression could improve this image's download size.",
                        wastedBytes: 80000,
                      },
                      {
                        reason:
                          "This image file is larger than it needs to be (800x600) for its displayed dimensions (400x300). Use responsive images to reduce the image download size.",
                        wastedBytes: 40000,
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      ],
    };

    const { container } = render(<MetricCauseCard cause={cause} acronym="LCP" />);

    const text = container.textContent ?? "";
    expect(text).toContain("Use a modern format or compress more");
    expect(text).toContain("Serve images at the displayed size");
    expect(text.match(/cover\.jpg/g)).toHaveLength(1);
    expect(container.querySelector('[data-testid="render-details"]')).toBeNull();
  });
});
