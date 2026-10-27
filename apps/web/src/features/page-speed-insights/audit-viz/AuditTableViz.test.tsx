import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";

vi.mock("@/features/page-speed-insights/shared/ReportComparisonBarChart", () => ({
  ReportComparisonBarChart: ({ data }: { data: unknown[] }) => (
    <div data-testid="bar-chart">{data.length} rows</div>
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
  it("renders savings bar for unused-css-rules", () => {
    const { container } = render(
      <AuditTableViz
        rows={[
          row("unused-css-rules", [
            { url: "https://example.com/a.css", wastedBytes: 1200 },
            { url: "https://example.com/b.css", wastedBytes: 800 },
          ]),
        ]}
      />,
    );

    expect(container.querySelector('[data-testid="bar-chart"]')?.textContent).toContain("2 rows");
  });

  it("skips custom viz for cache-insight (table only)", () => {
    const { container } = render(
      <AuditTableViz
        rows={[
          row("cache-insight", [{ url: "https://example.com/a.js", wastedBytes: 1200 }]),
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
      <AuditTableViz rows={[row("viewport-insight", [{ node: { type: "node", snippet: "<meta>" } }])]} />,
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


