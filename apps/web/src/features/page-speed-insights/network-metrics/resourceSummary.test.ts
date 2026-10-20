import { describe, expect, it } from "vitest";
import { collectResourceSummaries } from "@/features/page-speed-insights/network-metrics/resourceSummary";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

function report(
  label: string,
  rows: Array<Record<string, string | number>> | null,
): InsightsContextItem {
  return {
    label,
    item: {
      lighthouseResult: {
        audits: rows
          ? {
              "resource-summary": {
                id: "resource-summary",
                title: "Resources Summary",
                score: 1,
                scoreDisplayMode: "informative",
                details: {
                  type: "table",
                  headings: [],
                  items: rows,
                },
              },
            }
          : {},
      },
    },
  } as unknown as InsightsContextItem;
}

describe("collectResourceSummaries", () => {
  it("returns tiles in audit order and drops empty resource types", () => {
    const summaries = collectResourceSummaries([
      report("Mobile", [
        { resourceType: "total", label: "Total", requestCount: 10, transferSize: 2048 },
        { resourceType: "script", label: "Script", requestCount: 4, transferSize: 1024 },
        { resourceType: "media", label: "Media", requestCount: 0, transferSize: 0 },
        { resourceType: "third-party", label: "Third-party", requestCount: 3, transferSize: 512 },
      ]),
    ]);

    expect(summaries).toEqual([
      {
        label: "Mobile",
        tiles: [
          { resourceType: "total", label: "Total", requestCount: 10, transferSize: 2048 },
          { resourceType: "script", label: "Script", requestCount: 4, transferSize: 1024 },
          { resourceType: "third-party", label: "Third-party", requestCount: 3, transferSize: 512 },
        ],
      },
    ]);
  });

  it("skips reports that have no resource-summary audit", () => {
    expect(collectResourceSummaries([report("Desktop", null)])).toEqual([]);
  });

  it("keeps one summary per report", () => {
    const summaries = collectResourceSummaries([
      report("Mobile", [
        { resourceType: "total", label: "Total", requestCount: 2, transferSize: 100 },
      ]),
      report("Desktop", [
        { resourceType: "image", label: "Image", requestCount: 1, transferSize: 50 },
      ]),
    ]);

    expect(summaries.map((summary) => summary.label)).toEqual(["Mobile", "Desktop"]);
  });
});
