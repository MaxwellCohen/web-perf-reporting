import { describe, expect, it } from "vitest";
import type { PageSpeedInsights } from "@/lib/schema";
import {
  collectAuditData,
  getWorstScore,
  combineMetricSavings,
  extractTableFromListItems,
  combineAuditItems,
} from "@/features/page-speed-insights/RecommendationsSection/auditProcessing";

function createItem(audits: Record<string, unknown> = {}): PageSpeedInsights {
  return {
    lighthouseResult: { audits },
    analysisUTCTimestamp: "2024-01-01T00:00:00.000Z",
  } as PageSpeedInsights;
}

describe("auditProcessing", () => {
  describe("collectAuditData", () => {
    it("returns empty map when items have no audits", () => {
      const result = collectAuditData([{ item: createItem({}), label: "Mobile" }]);
      expect(result.size).toBe(0);
    });

    it("collects audits from multiple items by auditId", () => {
      const result = collectAuditData([
        {
          item: createItem({
            "unused-css": {
              id: "unused-css",
              title: "Unused CSS",
              score: 0.5,
              scoreDisplayMode: "numeric",
            },
          }),
          label: "Mobile",
        },
        {
          item: createItem({
            "unused-css": {
              id: "unused-css",
              title: "Unused CSS",
              score: 0.8,
              scoreDisplayMode: "numeric",
            },
          }),
          label: "Desktop",
        },
      ]);
      expect(result.has("unused-css")).toBe(true);
      expect(result.get("unused-css")!.length).toBe(2);
    });

    it("skips null audit entries", () => {
      const result = collectAuditData([
        {
          item: createItem({
            "audit-a": { id: "audit-a", title: "A", score: 1, scoreDisplayMode: "numeric" },
            "audit-b": null,
          }),
          label: "Mobile",
        },
      ]);
      expect(result.has("audit-a")).toBe(true);
      expect(result.has("audit-b")).toBe(false);
    });
  });

  describe("getWorstScore", () => {
    it("returns minimum score from entries", () => {
      const entries = [
        { auditId: "a", audit: { score: 0.9 }, label: "M", item: {} },
        { auditId: "a", audit: { score: 0.3 }, label: "D", item: {} },
      ];
      expect(getWorstScore(entries as any)).toBe(0.3);
    });

    it("returns null when all scores are null", () => {
      const entries = [{ auditId: "a", audit: { score: null }, label: "M", item: {} }];
      expect(getWorstScore(entries as any)).toBe(null);
    });
  });

  describe("combineMetricSavings", () => {
    it("returns empty object when no metricSavings", () => {
      const entries = [{ audit: { metricSavings: undefined }, label: "M", auditId: "a", item: {} }];
      expect(combineMetricSavings(entries as any)).toEqual({});
    });

    it("combines and takes max savings per metric", () => {
      const entries = [
        { audit: { metricSavings: { FCP: 100, LCP: 200 } }, label: "M", auditId: "a", item: {} },
        { audit: { metricSavings: { FCP: 150, LCP: 100 } }, label: "D", auditId: "a", item: {} },
      ];
      expect(combineMetricSavings(entries as any)).toEqual({ FCP: 150, LCP: 200 });
    });

    it("ignores zero or falsy savings", () => {
      const entries = [
        { audit: { metricSavings: { FCP: 0, LCP: 50 } }, label: "M", auditId: "a", item: {} },
      ];
      expect(combineMetricSavings(entries as any)).toEqual({ LCP: 50 });
    });
  });

  describe("extractTableFromListItems", () => {
    it("returns empty items when list has no table items", () => {
      const list = { items: [{ type: "text", content: "hello" }] };
      expect(extractTableFromListItems(list as any)).toEqual({
        items: [],
        headings: undefined,
      });
    });

    it("extracts items and headings from table type in list", () => {
      const list = {
        items: [
          {
            type: "table",
            items: [{ url: "https://a.com", wastedBytes: 100 }],
            headings: [
              { key: "url", label: "URL" },
              { key: "wastedBytes", label: "Wasted" },
            ],
          },
        ],
      };
      const result = extractTableFromListItems(list as any);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({ url: "https://a.com", wastedBytes: 100 });
      expect(result.headings).toHaveLength(2);
    });
  });

  describe("combineAuditItems", () => {
    it("extracts table details", () => {
      const entries = [
        {
          auditId: "x",
          label: "Mobile",
          audit: {
            details: {
              type: "table",
              items: [{ a: 1 }],
              headings: [{ key: "a", label: "A" }],
            },
          },
          item: {},
        },
      ];
      const result = combineAuditItems(entries as any);
      expect(result.allTableDataItems).toHaveLength(1);
      expect(result.tableHeadings).toHaveLength(1);
      expect(result.itemsByReport.get("Mobile")).toHaveLength(1);
    });

    it("extracts opportunity details items", () => {
      const entries = [
        {
          auditId: "x",
          label: "Mobile",
          audit: {
            details: {
              type: "opportunity",
              items: [{ url: "https://x.com", wastedBytes: 100 }],
            },
          },
          item: {},
        },
      ];
      const result = combineAuditItems(entries as any);
      expect(result.allItems).toHaveLength(1);
      expect(result.allItems[0]).toEqual({ url: "https://x.com", wastedBytes: 100 });
    });

    it("ignores details without type", () => {
      const entries = [
        {
          auditId: "x",
          label: "Mobile",
          audit: { details: {} },
          item: {},
        },
      ];
      const result = combineAuditItems(entries as any);
      expect(result.allTableDataItems).toHaveLength(0);
      expect(result.allItems).toHaveLength(0);
    });
  });
});
