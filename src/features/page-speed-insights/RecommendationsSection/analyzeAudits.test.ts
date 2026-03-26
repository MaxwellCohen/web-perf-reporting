import { describe, expect, it } from "vitest";
import {
  analyzeAudits,
  hasDetails,
} from "@/features/page-speed-insights/RecommendationsSection/analyzeAudits";

function createItem(audits: Record<string, unknown> = {}) {
  return {
    item: {
      lighthouseResult: { audits },
      analysisUTCTimestamp: "2024-01-01T00:00:00.000Z",
    } as any,
    label: "Mobile",
  };
}

describe("analyzeAudits", () => {
  it("returns empty array when no items or no applicable audits", () => {
    expect(analyzeAudits([])).toEqual([]);
    expect(
      analyzeAudits([
        createItem({
          "unused-css": {
            id: "unused-css",
            title: "Unused CSS",
            score: 0.5,
            scoreDisplayMode: "notapplicable",
          },
        }),
      ]),
    ).toEqual([]);
  });

  it("includes metricSavings recommendations when scoreDisplayMode is metricSavings", () => {
    const items = [
      createItem({
        "unused-css-rules": {
          id: "unused-css-rules",
          title: "Remove unused CSS",
          score: 0.6,
          scoreDisplayMode: "metricSavings",
          metricSavings: { FCP: 100 },
          details: {
            type: "opportunity",
            items: [{ url: "https://example.com/style.css", wastedBytes: 500 }],
          },
        },
      }),
    ];
    (items[0] as any).item = (items[0] as any).item;
    const result = analyzeAudits(items as any);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].impact?.metric).toBeDefined();
    expect(result[0].actionableSteps.length).toBeGreaterThanOrEqual(0);
  });

  it("skips audits in hideAuditId list", () => {
    const items = [
      createItem({
        "main-thread-tasks": {
          id: "main-thread-tasks",
          title: "Main thread tasks",
          score: 0,
          scoreDisplayMode: "numeric",
          details: { type: "table", items: [{ duration: 10 }], headings: [] },
        },
      }),
    ];
    const result = analyzeAudits(items as any);
    expect(result.filter((r) => r.id.includes("main-thread-tasks"))).toHaveLength(0);
  });
});

describe("hasDetails", () => {
  it("returns false for metric-only titles without Reduce", () => {
    expect(
      hasDetails({
        title: "Largest Contentful Paint",
        actionableSteps: [],
        tableData: undefined,
        items: undefined,
      } as any),
    ).toBe(false);
    expect(
      hasDetails({
        title: "Speed Index",
        actionableSteps: [{ step: "x", reports: [] }],
        tableData: undefined,
        items: undefined,
      } as any),
    ).toBe(false);
  });

  it("returns false when tableData has empty items", () => {
    expect(
      hasDetails({
        title: "Some Audit",
        actionableSteps: [],
        tableData: { items: [], headings: [] },
        items: undefined,
      } as any),
    ).toBe(false);
  });

  it("returns false when items array is empty", () => {
    expect(
      hasDetails({
        title: "Some Audit",
        actionableSteps: [],
        tableData: undefined,
        items: [],
      } as any),
    ).toBe(false);
  });

  it("returns true when actionableSteps is non-empty", () => {
    expect(
      hasDetails({
        title: "Some Audit",
        actionableSteps: [{ step: "Do something", reports: ["Mobile"] }],
        tableData: undefined,
        items: undefined,
      } as any),
    ).toBe(true);
  });

  it("returns true when tableData has items", () => {
    expect(
      hasDetails({
        title: "Some Audit",
        actionableSteps: [],
        tableData: { items: [{ url: "https://x.com" }], headings: [{ key: "url", label: "URL" }] },
        items: undefined,
      } as any),
    ).toBe(true);
  });
});
