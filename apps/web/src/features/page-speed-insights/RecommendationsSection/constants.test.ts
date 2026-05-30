import { describe, expect, it } from "vitest";
import { METRIC_NAMES } from "@/features/page-speed-insights/RecommendationsSection/constants";

describe("constants", () => {
  it("METRIC_NAMES maps known metric keys to display names", () => {
    expect(METRIC_NAMES.LCP).toBe("Largest Contentful Paint");
    expect(METRIC_NAMES.FCP).toBe("First Contentful Paint");
    expect(METRIC_NAMES.TBT).toBe("Total Blocking Time");
    expect(METRIC_NAMES.CLS).toBe("Cumulative Layout Shift");
    expect(METRIC_NAMES.INP).toBe("Interaction to Next Paint");
    expect(METRIC_NAMES.SI).toBe("Speed Index");
  });
});
