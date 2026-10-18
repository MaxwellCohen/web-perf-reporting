import { describe, expect, it } from "vitest";
import { getRecommendationPriority } from "@/features/page-speed-insights/RecommendationsSection/utils";

describe("getRecommendationPriority", () => {
  it("returns high for null, undefined, or 0 score", () => {
    expect(getRecommendationPriority(null)).toBe("high");
    expect(getRecommendationPriority(undefined)).toBe("high");
    expect(getRecommendationPriority(0)).toBe("high");
  });

  it("returns high for score < 0.5", () => {
    expect(getRecommendationPriority(0.3)).toBe("high");
    expect(getRecommendationPriority(0.49)).toBe("high");
  });

  it("returns medium for 0.5 <= score < 0.75", () => {
    expect(getRecommendationPriority(0.5)).toBe("medium");
    expect(getRecommendationPriority(0.74)).toBe("medium");
  });

  it("returns low for score >= 0.75 when savings are small", () => {
    expect(getRecommendationPriority(0.75)).toBe("low");
    expect(getRecommendationPriority(0.9)).toBe("low");
  });

  it("returns high when savings > 1000", () => {
    expect(getRecommendationPriority(0.8, 1500)).toBe("high");
  });

  it("returns medium when savings > 500 and <= 1000", () => {
    expect(getRecommendationPriority(0.8, 600)).toBe("medium");
  });
});
