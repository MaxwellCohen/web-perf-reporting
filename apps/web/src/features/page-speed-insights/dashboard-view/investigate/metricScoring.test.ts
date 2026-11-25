import { describe, expect, it } from "vitest";
import exampleReport from "../../../../../test-fixtures/example-report.json";
import {
  estimatePointsGained,
  metricScore,
  pointsLost,
} from "@/features/page-speed-insights/dashboard-view/investigate/metricScoring";
import type { PageSpeedDashboardItem } from "@/lib/page-speed-insights/types";

const { item } = (exampleReport as unknown as PageSpeedDashboardItem[])[0];
const audits = item.lighthouseResult.audits!;

describe("metricScore", () => {
  it("scores the p10 at 0.9 and the median at 0.5", () => {
    expect(metricScore("LCP", 2500, "mobile")).toBeCloseTo(0.9, 2);
    expect(metricScore("LCP", 4000, "mobile")).toBeCloseTo(0.5, 2);
    expect(metricScore("TBT", 350, "desktop")).toBeCloseTo(0.5, 2);
  });

  it("reproduces the fixture's Lighthouse scores", () => {
    const cases = [
      ["FCP", "first-contentful-paint"],
      ["LCP", "largest-contentful-paint"],
      ["TBT", "total-blocking-time"],
      ["CLS", "cumulative-layout-shift"],
      ["SI", "speed-index"],
    ] as const;
    for (const [acronym, id] of cases) {
      const audit = audits[id]!;
      expect(metricScore(acronym, audit.numericValue!, "desktop")).toBeCloseTo(audit.score!, 1);
      expect(
        Math.abs(metricScore(acronym, audit.numericValue!, "desktop") - audit.score!),
      ).toBeLessThan(0.02);
    }
  });
});

describe("points", () => {
  it("pointsLost is weight times the missing score", () => {
    expect(pointsLost(30, 0.5)).toBe(15);
  });

  it("estimatePointsGained rewards cutting TBT and ignores unknown savings", () => {
    expect(estimatePointsGained(item, { TBT: 1000 })).toBeGreaterThan(0);
    expect(estimatePointsGained(item, {})).toBe(0);
  });
});
