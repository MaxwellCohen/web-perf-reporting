import { describe, expect, it } from "vitest";
import { getCategoryAndGenericSteps } from "@/features/page-speed-insights/RecommendationsSection/categorySteps";

describe("categorySteps", () => {

  it("returns both category and steps together", () => {
    expect(getCategoryAndGenericSteps("unused-javascript", []).category).toBe("JavaScript");
    expect(getCategoryAndGenericSteps("unused-javascript", []).genericSteps.length).toBeGreaterThan(
      0,
    );
  });
});
