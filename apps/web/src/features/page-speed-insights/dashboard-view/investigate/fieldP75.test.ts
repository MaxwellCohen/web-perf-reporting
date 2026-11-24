import { describe, expect, it } from "vitest";
import { fieldP75 } from "@/features/page-speed-insights/dashboard-view/investigate/fieldP75";
import type { PageSpeedInsights } from "@/lib/schema";

const metric = (percentile: number) => ({ percentile, distributions: [], category: "FAST" });

describe("fieldP75", () => {
  it("prefers URL data, falls back to origin, and scales CLS", () => {
    const item = {
      loadingExperience: { metrics: { LARGEST_CONTENTFUL_PAINT_MS: metric(2296) } },
      originLoadingExperience: {
        metrics: {
          LARGEST_CONTENTFUL_PAINT_MS: metric(9999),
          CUMULATIVE_LAYOUT_SHIFT_SCORE: metric(9),
        },
      },
    } as unknown as PageSpeedInsights;
    const result = fieldP75(item);
    expect(result.LCP).toEqual({ value: 2296, display: "2.30 s", scope: "url" });
    expect(result.CLS).toEqual({ value: 0.09, display: "0.09", scope: "origin" });
    expect(result.INP).toBeNull();
  });
});
