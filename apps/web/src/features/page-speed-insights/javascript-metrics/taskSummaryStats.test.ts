import { describe, expect, it } from "vitest";
import { computeTaskSummaryStats } from "@/features/page-speed-insights/javascript-metrics/taskSummaryStats";
import { getQuickWinRecommendations } from "@/features/page-speed-insights/RecommendationsSection/RecommendationsSummary";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";

describe("computeTaskSummaryStats", () => {
  it("uses diagnostics when available", () => {
    const stats = computeTaskSummaryStats([
      {
        label: "Mobile",
        diagnostics: [
          {
            numTasks: 10,
            totalTaskTime: 500,
            numTasksOver10ms: 3,
            numTasksOver25ms: 2,
            numTasksOver50ms: 1,
            numTasksOver100ms: 0,
            numTasksOver500ms: 0,
          },
        ],
        mainThreadTasks: [],
      },
    ]);

    expect(stats[0]).toMatchObject({
      label: "Mobile",
      totalTasks: 10,
      totalTaskTime: 500,
      numTasksOver10ms: 3,
    });
  });
});

describe("getQuickWinRecommendations", () => {
  it("returns high priority recommendations with savings", () => {
    const recs = [
      { id: "1", priority: "high", impact: { savings: 100 } },
      { id: "2", priority: "medium", impact: { savings: 200 } },
      { id: "3", priority: "high", impact: { savings: 0 } },
      { id: "4", priority: "high", impact: { savings: 50 } },
    ] as Recommendation[];

    const quickWins = getQuickWinRecommendations(recs);
    expect(quickWins.map((r) => r.id)).toEqual(["1", "4"]);
  });
});

describe("computeTaskSummaryStats consistency", () => {
  it("derives thresholds from the task list and totals from diagnostics", () => {
    const [s] = computeTaskSummaryStats([
      {
        label: "x",
        diagnostics: [{ numTasks: 20, totalTaskTime: 400 }],
        mainThreadTasks: [{ duration: 60 }, { duration: 12 }, { duration: 6 }],
      },
    ]);
    expect(s.totalTasks).toBe(20);
    expect(s.averageTaskDuration).toBe(20);
    expect(s.numTasksOver10ms).toBe(2);
    expect(s.numTasksOver50ms).toBe(1);
    expect(s.longestTaskDuration).toBe(60);
  });
});
