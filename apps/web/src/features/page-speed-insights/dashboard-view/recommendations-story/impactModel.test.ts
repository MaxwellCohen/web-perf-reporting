import { describe, expect, it } from "vitest";
import exampleReport from "../../../../../test-fixtures/example-report.json";
import {
  buildImpactOpportunities,
  planPrompt,
  projectScore,
} from "@/features/page-speed-insights/dashboard-view/recommendations-story/impactModel";
import type { PageSpeedDashboardItem } from "@/lib/page-speed-insights/types";
import type { PageSpeedInsights } from "@/lib/schema";

const { item } = (exampleReport as unknown as PageSpeedDashboardItem[])[0];

/** Poor LCP (10 s), good FCP, one audit saving LCP and one saving only FCP. */
function stubItem(): PageSpeedInsights {
  return {
    lighthouseResult: {
      requestedUrl: "https://example.com/",
      configSettings: { formFactor: "mobile" },
      categories: {
        performance: {
          score: 0.4,
          auditRefs: [
            { id: "first-contentful-paint", weight: 10 },
            { id: "largest-contentful-paint", weight: 25 },
          ],
        },
      },
      audits: {
        "first-contentful-paint": { numericValue: 1000, score: 1, title: "FCP" },
        "largest-contentful-paint": { numericValue: 10000, score: 0, title: "LCP" },
        "render-blocking-insight": {
          title: "Render blocking requests",
          score: 0,
          scoreDisplayMode: "metricSavings",
          description: "Requests block [first paint](https://x.dev). More text.",
          metricSavings: { LCP: 3000, FCP: 0 },
        },
        "font-display-insight": {
          title: "Font display",
          score: 0,
          scoreDisplayMode: "metricSavings",
          metricSavings: { FCP: 200 },
        },
      },
    },
  } as unknown as PageSpeedInsights;
}

describe("buildImpactOpportunities", () => {
  it("ranks the fixture's savings by points gained", () => {
    const list = buildImpactOpportunities(item);
    expect(list.length).toBeGreaterThan(0);
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].pointsGained).toBeGreaterThanOrEqual(list[i].pointsGained);
    }
    expect(list.map((o) => o.id)).toContain("bootup-time");
  });

  it("gains points for LCP savings on a poor LCP, none for a passing metric", () => {
    const [lcp, fcp] = buildImpactOpportunities(stubItem());
    expect(lcp.id).toBe("render-blocking-insight");
    expect(lcp.pointsGained).toBeGreaterThan(0);
    expect(lcp.why).toBe("Requests block first paint.");
    expect(fcp.pointsGained).toBe(0);
  });
});

describe("projectScore", () => {
  it("combines savings and never exceeds 100", () => {
    const stub = stubItem();
    const list = buildImpactOpportunities(stub);
    expect(projectScore(stub, [], list)).toEqual({ now: 40, projected: 40 });
    const one = projectScore(stub, ["render-blocking-insight"], list);
    expect(one.projected).toBeGreaterThan(40);
    const huge = list.map((o) => ({ ...o, savings: { LCP: 1e9 } }));
    const capped = projectScore(
      stub,
      huge.map((o) => o.id),
      huge,
    );
    expect(capped.projected).toBeLessThanOrEqual(100);
    // LCP can only drop to zero, so a 1e9 saving equals saving the full 10 s.
    expect(capped.projected).toBe(
      projectScore(stub, ["a"], [{ ...list[0], id: "a", savings: { LCP: 10000 } }]).projected,
    );
  });
});

describe("planPrompt", () => {
  it("lists every plan item", () => {
    const list = buildImpactOpportunities(item).slice(0, 2);
    const text = planPrompt(item, list);
    expect(text).toContain(`1. ${list[0].title}`);
    expect(text).toContain(`2. ${list[1].title}`);
  });
});
