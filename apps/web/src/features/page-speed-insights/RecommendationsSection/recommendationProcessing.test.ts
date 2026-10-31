import { describe, expect, it } from "vitest";
import { processMetricSavingsAudit, processFailedAudit } from "@/features/page-speed-insights/RecommendationsSection/recommendationProcessing";

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
      );
      expect(result).not.toBeNull();
      expect(result!.tableData).toBeDefined();
      expect(result!.tableData!.items).toHaveLength(1);
      expect(result!.category).toBe("Accessibility");
    });
  });
});
