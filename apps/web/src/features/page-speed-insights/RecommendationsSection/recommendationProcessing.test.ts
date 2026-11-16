import { describe, expect, it } from "vitest";
import {
  processMetricSavingsAudit,
  processFailedAudit,
} from "@/features/page-speed-insights/RecommendationsSection/recommendationProcessing";

const baseAudit = {
  id: "unused-css",
  title: "Remove unused CSS",
  score: 0.5,
  scoreDisplayMode: "numeric",
  description: "Some description",
  details: undefined,
  explanation: undefined,
  displayValue: undefined,
};

describe("recommendationProcessing", () => {
  describe("processMetricSavingsAudit", () => {
    it("returns recommendation with id, title, priority, category, impact, actionableSteps", () => {
      const entries = [
        {
          auditId: "unused-css-rules",
          audit: { ...baseAudit, details: { type: "opportunity", items: [] } },
          label: "Mobile",
          item: {},
        },
      ];
      const result = processMetricSavingsAudit(
        "unused-css-rules",
        baseAudit as any,
        entries as any,
        "FCP",
        100,
        0.5,
        [],
      );
      expect(result.id).toBe("unused-css-rules-FCP");
      expect(result.title).toBe("Remove unused CSS");
      expect(result.priority).toBe("medium");
      expect(result.impact.metric).toBe("First Contentful Paint");
      expect(result.impact.savings).toBe(100);
      expect(result.category).toBe("Performance");
      expect(result.actionableSteps.length).toBeGreaterThan(0);
    });

    it("treats INP savings as milliseconds", () => {
      const result = processMetricSavingsAudit(
        "unused-css-rules",
        baseAudit as any,
        [] as any,
        "INP",
        100,
        0.5,
        [],
      );
      expect(result.impact.unit).toBe("ms");
    });

    it("uses only the first sentence of a longer description as the default step", () => {
      const first =
        "Consider setting [font-display](https://developer.chrome.com/docs/performance/insights/font-display) to swap or optional to ensure text is consistently visible.";
      const audit = {
        ...baseAudit,
        id: "font-display-insight",
        description: `${first} swap can be further optimized to mitigate layout shifts with [font metric overrides](https://developer.chrome.com/blog/font-fallbacks).`,
      };
      const result = processMetricSavingsAudit(
        audit.id,
        audit as any,
        [{ auditId: audit.id, audit, label: "Mobile", item: {} }] as any,
        "FCP",
        120,
        0.5,
        [],
      );
      expect(result.actionableSteps.map((s) => s.step)).toEqual([first]);
    });
  });

  describe("processFailedAudit", () => {
    it("returns null when no actionable steps and no tableData and no description", () => {
      const result = processFailedAudit(
        "some-audit",
        { ...baseAudit, description: undefined } as any,
        [] as any,
        null,
        [],
        undefined,
        undefined,
      );
      expect(result).toBeNull();
    });

    it("keeps a description's markdown link whole when it becomes the step", () => {
      // Real Lighthouse text: one sentence, too long for the per-sentence steps,
      // whose first "." is inside the link URL.
      const description =
        "[Avoid chaining critical requests](https://developer.chrome.com/docs/performance/insights/network-dependency-tree) by reducing the length of chains, reducing the download size of resources, or deferring the download of unnecessary resources to improve page load.";
      const audit = { ...baseAudit, id: "network-dependency-tree-insight", score: 0, description };
      const result = processFailedAudit(
        audit.id,
        audit as any,
        [{ auditId: audit.id, audit, label: "Mobile", item: {} }] as any,
        0,
        [],
        undefined,
        undefined,
      );
      expect(result!.actionableSteps.map((s) => s.step)).toEqual([description]);
    });

    it("returns recommendation with tableData when items and headings provided", () => {
      const entries = [
        {
          auditId: "heading-order",
          audit: {
            ...baseAudit,
            title: "Heading order",
            description: "Ensure headings follow a logical order.",
          },
          label: "Mobile",
          item: {},
        },
      ];
      const result = processFailedAudit(
        "heading-order",
        entries[0].audit as any,
        entries as any,
        0,
        [{ url: "https://x.com" }] as any,
        [{ key: "url", label: "URL" }] as any,
        "Explanation",
        new Map([["Mobile", [{ url: "https://x.com" }] as any]]),
        "Accessibility",
      );
      expect(result).not.toBeNull();
      expect(result!.tableData).toBeDefined();
      expect(result!.tableData!.items).toHaveLength(1);
      expect(result!.category).toBe("Accessibility");
    });
  });
});
