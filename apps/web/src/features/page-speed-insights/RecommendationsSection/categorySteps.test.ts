import { describe, expect, it } from "vitest";
import {
  getCategoryAndGenericSteps,
  getCategoryFromAuditId,
  getGenericStepsForCategory,
} from "@/features/page-speed-insights/RecommendationsSection/categorySteps";

describe("categorySteps", () => {
  it("maps audit ids to the expected categories", () => {
    expect(getCategoryFromAuditId("render-blocking-resources")).toBe("Render Blocking");
    expect(getCategoryFromAuditId("unused-javascript")).toBe("JavaScript");
    expect(getCategoryFromAuditId("unused-css-rules")).toBe("CSS");
    expect(getCategoryFromAuditId("offscreen-images")).toBe("Images");
    expect(getCategoryFromAuditId("javascript-execution-time")).toBe("JavaScript");
    expect(getCategoryFromAuditId("server-response-time")).toBe("Server");
    expect(getCategoryFromAuditId("preconnect-to-required-origins")).toBe("Resource Hints");
    expect(getCategoryFromAuditId("font-display")).toBe("Fonts");
    expect(getCategoryFromAuditId("redirects")).toBe("Network");
    expect(getCategoryFromAuditId("network-requests")).toBe("Network");
    expect(getCategoryFromAuditId("some-other-audit")).toBe("Performance");
  });

  it("returns specific generic steps for known audit categories", () => {
    expect(
      getGenericStepsForCategory("render-blocking-resources", []).map(({ step }) => step),
    ).toContain("Inline critical CSS");

    expect(
      getGenericStepsForCategory("javascript-execution-time", []).map(({ step }) => step),
    ).toContain("Remove unused dependencies");

    expect(getGenericStepsForCategory("redirects", []).map(({ step }) => step)).toEqual([
      "Use direct URLs when possible",
      "Implement server-side redirects instead of client-side",
    ]);
  });

  it("returns default steps and recommendation review guidance for unknown audits", () => {
    expect(getGenericStepsForCategory("custom-audit", []).map(({ step }) => step)).toEqual([
      "Review the audit details for specific recommendations",
      "Test changes in a staging environment",
      "Monitor performance metrics after implementation",
    ]);

    expect(
      getGenericStepsForCategory("custom-audit", [{ step: "Use a CDN", reports: [] }]).map(
        ({ step }) => step,
      ),
    ).toEqual([
      "Test changes in a staging environment",
      "Monitor performance metrics after implementation",
    ]);
  });

  it("returns both category and steps together", () => {
    expect(getCategoryAndGenericSteps("unused-javascript", []).category).toBe("JavaScript");
    expect(getCategoryAndGenericSteps("unused-javascript", []).genericSteps.length).toBeGreaterThan(
      0,
    );
  });
});
