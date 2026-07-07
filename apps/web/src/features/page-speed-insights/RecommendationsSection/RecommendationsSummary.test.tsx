import { describe, expect, it } from "vitest";
import { getQuickWinRecommendations } from "@/features/page-speed-insights/RecommendationsSection/RecommendationsSummary";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";

describe("getQuickWinRecommendations", () => {
  it("returns high priority recommendations with savings capped at limit", () => {
    const recommendations = [
      {
        id: "1",
        priority: "high",
        impact: { savings: 100 },
      },
      {
        id: "2",
        priority: "high",
        impact: { savings: 200 },
      },
      {
        id: "3",
        priority: "medium",
        impact: { savings: 300 },
      },
      {
        id: "4",
        priority: "high",
        impact: { savings: 0 },
      },
    ] as Recommendation[];

    const quickWins = getQuickWinRecommendations(recommendations, 1);
    expect(quickWins).toHaveLength(1);
    expect(quickWins[0].id).toBe("2");
  });
});
