import { describe, expect, it } from "vitest";
import { recommendationsStoryFrom } from "@/features/page-speed-insights/dashboard-view/recommendations-story/recommendationsStoryModel";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";

function recommendation({
  id,
  title,
  priority,
  savings,
  unit,
  metric,
}: {
  id: string;
  title?: string;
  priority: Recommendation["priority"];
  savings?: number;
  unit?: string;
  metric?: string;
}): Recommendation {
  return {
    id,
    title: title ?? id,
    description: "",
    priority,
    category: "Performance",
    impact: { savings, unit, metric },
    actionableSteps: [],
  };
}

describe("recommendationsStoryFrom", () => {
  it("counts high, medium, and low and omits priorities with no items", () => {
    const story = recommendationsStoryFrom([
      recommendation({ id: "low-a", priority: "low" }),
      recommendation({ id: "high-a", priority: "high" }),
      recommendation({ id: "high-b", priority: "high" }),
      recommendation({ id: "low-b", priority: "low" }),
    ]);

    expect(story?.counts).toEqual([
      { priority: "high", count: 2 },
      { priority: "low", count: 2 },
    ]);
  });

  it("splits potential savings into milliseconds and bytes", () => {
    const story = recommendationsStoryFrom([
      recommendation({ id: "ms", priority: "high", savings: 100, unit: "ms" }),
      recommendation({
        id: "milliseconds",
        priority: "medium",
        savings: 50,
        unit: "milliseconds",
      }),
      recommendation({ id: "upper", priority: "low", savings: 10, unit: "MS" }),
      recommendation({ id: "bytes", priority: "high", savings: 200, unit: "bytes" }),
      recommendation({ id: "byte", priority: "medium", savings: 80, unit: "byte" }),
      recommendation({ id: "negative", priority: "low", savings: -20, unit: "ms" }),
      recommendation({ id: "other", priority: "high", savings: 999, unit: "score" }),
    ]);

    expect(story?.milliseconds).toBe(140);
    expect(story?.bytes).toBe(280);
  });

  it("orders the three largest savings and drops savings that are not positive", () => {
    const recommendations = [
      recommendation({ id: "fourth", priority: "low", savings: 50, unit: "ms" }),
      recommendation({ id: "zero", priority: "high", savings: 0, unit: "ms" }),
      recommendation({ id: "bytes", priority: "medium", savings: 500, unit: "bytes" }),
      recommendation({ id: "negative", priority: "low", savings: -10, unit: "ms" }),
      recommendation({
        id: "largest",
        priority: "high",
        savings: 1000,
        unit: "ms",
        metric: "Largest Contentful Paint",
      }),
      recommendation({ id: "third", priority: "medium", savings: 200, unit: "ms" }),
      recommendation({ id: "none", priority: "low" }),
    ];
    const ids = recommendations.map((item) => item.id);

    const story = recommendationsStoryFrom(recommendations);

    expect(story?.largest).toEqual([
      {
        id: "largest",
        title: "largest",
        priority: "high",
        savings: 1000,
        unit: "ms",
        metric: "Largest Contentful Paint",
      },
      { id: "bytes", title: "bytes", priority: "medium", savings: 500, unit: "bytes" },
      { id: "third", title: "third", priority: "medium", savings: 200, unit: "ms" },
    ]);
    expect(recommendations.map((item) => item.id)).toEqual(ids);
  });

  it("returns null when there are no recommendations", () => {
    expect(recommendationsStoryFrom([])).toBeNull();
  });
});
