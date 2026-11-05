import { describe, expect, it } from "vitest";
import { buildMetricFixPlan } from "@/features/page-speed-insights/RecommendationsSection/fixPlan";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";

const rec = (id: string, metric: string, savings: number) =>
  ({ id, title: id, impact: { metric, savings, unit: "ms" } }) as Recommendation;

describe("buildMetricFixPlan", () => {
  it("groups by metric, ranks fixes, skips zero savings", () => {
    const plan = buildMetricFixPlan(
      [rec("a", "LCP", 100), rec("b", "LCP", 300), rec("c", "TBT", 50), rec("d", "LCP", 0)],
      1,
    );
    expect(plan.map((p) => p.metric)).toEqual(["LCP", "TBT"]);
    expect(plan[0].fixes.map((f) => f.id)).toEqual(["b"]);
    expect(plan[0].totalSavings).toBe(400);
  });
});

import { buildFixPlanPrompt } from "@/features/page-speed-insights/RecommendationsSection/fixPlan";

describe("buildFixPlanPrompt", () => {
  it("lists metrics and fixes", () => {
    const r = {
      ...rec("a", "LCP", 300),
      title: "Preload hero",
      actionableSteps: [{ step: "Add preload", reports: [] }],
    } as Recommendation;
    const out = buildFixPlanPrompt(buildMetricFixPlan([r]));
    expect(out).toContain("## LCP (up to 300 ms)");
    expect(out).toContain("Preload hero");
    expect(out).toContain("Add preload");
  });
});
