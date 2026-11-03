import { describe, expect, it } from "vitest";
import { formatFieldPercentile } from "./LoadingExperience";

describe("formatFieldPercentile", () => {
  it("unscales PSI CLS percentiles", () => {
    expect(formatFieldPercentile("CUMULATIVE_LAYOUT_SHIFT_SCORE", 5)).toBe("0.05");
  });
  it("leaves other metrics untouched", () => {
    expect(formatFieldPercentile("LARGEST_CONTENTFUL_PAINT_MS", 2300)).toBe("2300");
  });
});
