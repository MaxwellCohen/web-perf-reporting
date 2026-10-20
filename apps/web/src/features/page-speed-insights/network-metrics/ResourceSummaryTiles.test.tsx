import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResourceSummaryTiles } from "@/features/page-speed-insights/network-metrics/ResourceSummaryTiles";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

let items: InsightsContextItem[] = [];

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: () => items,
}));

function report(label: string, rows: Array<Record<string, string | number>>): InsightsContextItem {
  return {
    label,
    item: {
      lighthouseResult: {
        audits: {
          "resource-summary": {
            id: "resource-summary",
            title: "Resources Summary",
            score: 1,
            scoreDisplayMode: "informative",
            details: { type: "table", headings: [], items: rows },
          },
        },
      },
    },
  } as unknown as InsightsContextItem;
}

describe("ResourceSummaryTiles", () => {
  it("renders nothing when no report has a resource summary", () => {
    items = [];
    const { container } = render(<ResourceSummaryTiles />);
    expect(container.firstChild).toBeNull();
  });

  it("renders transfer size and request count tiles", () => {
    items = [
      report("Mobile", [
        { resourceType: "total", label: "Total", requestCount: 12, transferSize: 2 * 1024 * 1024 },
        { resourceType: "script", label: "Script", requestCount: 1, transferSize: 1024 * 1024 },
        { resourceType: "media", label: "Media", requestCount: 0, transferSize: 0 },
      ]),
    ];

    const { container } = render(<ResourceSummaryTiles />);
    const section = container.querySelector("section");
    expect(section?.getAttribute("aria-label")).toBe("Resources Summary");
    expect(section?.querySelector("h3")).toBeNull();

    const tiles = [...(section?.querySelectorAll("li") ?? [])];
    expect(tiles.map((tile) => tile.getAttribute("data-resource-type"))).toEqual([
      "total",
      "script",
    ]);
    expect(tiles[0]?.textContent).toContain("2.0 MiB");
    expect(tiles[0]?.textContent).toContain("12 requests");
    expect(tiles[1]?.textContent).toContain("1 request");
  });

  it("labels each report when comparing", () => {
    items = [
      report("Mobile", [
        { resourceType: "total", label: "Total", requestCount: 2, transferSize: 100 },
      ]),
      report("Desktop", [
        { resourceType: "total", label: "Total", requestCount: 4, transferSize: 200 },
      ]),
    ];

    const { container } = render(<ResourceSummaryTiles />);
    const headings = [...container.querySelectorAll("h3")].map((node) => node.textContent);
    expect(headings).toEqual(["Mobile", "Desktop"]);
  });
});
