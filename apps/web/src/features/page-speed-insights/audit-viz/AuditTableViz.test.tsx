import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";

vi.mock("@/features/page-speed-insights/shared/ReportComparisonBarChart", () => ({
  ReportComparisonBarChart: ({ data }: { data: unknown[] }) => (
    <div data-testid="bar-chart">{data.length} rows</div>
  ),
}));

vi.mock("./AuditStackedBarChart", () => ({
  AuditStackedBarChart: ({
    points,
    segmentOrder,
  }: {
    points: Array<{ category: string; segment: string; value: number }>;
    segmentOrder: string[];
  }) => (
    <div data-testid="stacked-chart" data-segments={segmentOrder.join(",")}>
      {points.map((point) => `${point.category}:${point.segment}=${point.value}`).join(" ")}
    </div>
  ),
}));

vi.mock("@/features/page-speed-insights/ImageDeliveryCause", () => ({
  ImageDeliveryCause: () => <div data-testid="image-delivery">image delivery</div>,
}));

vi.mock("@/features/page-speed-insights/waterfall/InteractiveWaterfall", () => ({
  InteractiveWaterfall: () => <div data-testid="waterfall">waterfall</div>,
}));

vi.mock("@/features/page-speed-insights/network-metrics/LCPBreakdownChart", () => ({
  LCPBreakdownChart: () => <div data-testid="lcp-chart">lcp</div>,
}));

import { AuditTableViz } from "./AuditTableViz";

function row(id: string, items: Array<Record<string, unknown>>): DetailTableItem {
  return {
    _userLabel: "Mobile",
    auditResult: {
      id,
      details: { type: "table", headings: [], items: items as never },
    },
  };
}

describe("AuditTableViz", () => {
  it("renders used vs savings bars for unused-css-rules", () => {
    const { getByTestId } = render(
      <AuditTableViz
        rows={[
          row("unused-css-rules", [
            { url: "https://example.com/a.css", wastedBytes: 1200, totalBytes: 2000 },
            // No totalBytes: only the savings segment is drawn.
            { url: "https://example.com/b.css", wastedBytes: 800 },
          ]),
        ]}
      />,
    );

    const chart = getByTestId("stacked-chart");
    expect(chart.getAttribute("data-segments")).toBe("used,savings");
    expect(chart.textContent).toContain("used=800");
    expect(chart.textContent).toContain("savings=1200");
    expect(chart.textContent).toContain("savings=800");
    expect(chart.textContent).not.toContain("unused");
  });

  it.each(["font-display-insight", "render-blocking-insight", "forced-reflow-insight"])(
    "renders no time-savings chart for %s (table only)",
    (auditId) => {
      const { container } = render(
        <AuditTableViz
          rows={[row(auditId, [{ url: "https://example.com/font.woff2", wastedMs: 133 }])]}
        />,
      );
      expect(container.firstChild).toBeNull();
    },
  );

  it("shows only the page-size card for total-byte-weight (no largest-transfers chart)", () => {
    const { container, queryByTestId } = render(
      <AuditTableViz
        rows={[
          {
            ...row("total-byte-weight", [{ url: "https://example.com/a.js", totalBytes: 2048 }]),
            _userLabel: "inline · Desktop",
          },
        ]}
      />,
    );
    expect(queryByTestId("bar-chart")).toBeNull();
    expect(container.textContent).toContain("Page transfer");
    expect(container.textContent).not.toContain("Largest transfers");
  });

  it("renders no category chart for mainthread-work-breakdown (table only)", () => {
    const { container } = render(
      <AuditTableViz
        rows={[
          row("mainthread-work-breakdown", [
            { group: "styleLayout", groupLabel: "Style & Layout", duration: 15 },
          ]),
        ]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders no chart for cache-insight (table only)", () => {
    const { container } = render(
      <AuditTableViz
        rows={[
          row("cache-insight", [
            {
              url: "https://example.com/a.js",
              wastedBytes: 1200,
              totalBytes: 2000,
              cacheLifetimeMs: 0,
            },
          ]),
        ]}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders image delivery cause for image-delivery-insight", () => {
    const { container } = render(
      <AuditTableViz
        rows={[
          row("image-delivery-insight", [
            { url: "https://example.com/hero.jpg", totalBytes: 1000, wastedBytes: 400 },
          ]),
        ]}
      />,
    );

    expect(container.querySelector('[data-testid="image-delivery"]')).toBeTruthy();
  });

  it("renders network waterfall for network-requests", () => {
    const { container } = render(
      <AuditTableViz
        rows={[
          row("network-requests", [
            {
              url: "https://example.com/",
              networkRequestTime: 0,
              networkEndTime: 100,
              resourceType: "Document",
            },
          ]),
        ]}
      />,
    );

    expect(container.querySelector('[data-testid="waterfall"]')).toBeTruthy();
  });

  it("renders null for unknown audits", () => {
    const { container } = render(
      <AuditTableViz rows={[row("some-unknown-audit", [{ label: "x" }])]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders severity findings for has-hsts", () => {
    const { container } = render(
      <AuditTableViz
        rows={[row("has-hsts", [{ description: "No HSTS header found", severity: "High" }])]}
      />,
    );

    expect(container.textContent).toContain("No HSTS header found");
    expect(container.textContent).toContain("High");
  });

  it("renders cls culprits with root causes", () => {
    const { container } = render(
      <AuditTableViz
        rows={[
          row("cls-culprits-insight", [
            {
              score: 0.08,
              node: { type: "node", nodeLabel: "Promo banner", selector: ".promo" },
              subItems: {
                type: "subitems",
                items: [
                  {
                    cause: "Unsized image element",
                    extra: {
                      type: "node",
                      nodeLabel: "Promo img",
                      snippet: '<img src="/promo.png">',
                    },
                  },
                  {
                    cause: "Web font",
                    extra: { type: "url", value: "https://cdn.example.com/font.woff2" },
                  },
                ],
              },
            },
          ]),
        ]}
      />,
    );

    expect(container.textContent).toContain("Promo banner");
    expect(container.textContent).toContain("Unsized image element");
    expect(container.textContent).toContain("Web font");
    expect(container.textContent).toContain("cdn.example.com");
  });
});
