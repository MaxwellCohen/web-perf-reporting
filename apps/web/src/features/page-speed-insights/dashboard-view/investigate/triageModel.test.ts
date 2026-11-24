import { describe, expect, it } from "vitest";
import exampleReport from "../../../../../test-fixtures/example-report.json";
import {
  buildTriage,
  triagePrompt,
} from "@/features/page-speed-insights/dashboard-view/investigate/triageModel";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import type { AuditResult, PageSpeedInsights } from "@/lib/schema";

const example = (exampleReport as unknown as InsightsContextItem[])[0].item;

function report(
  audits: Record<string, Partial<AuditResult>>,
  extra: Partial<PageSpeedInsights> = {},
): PageSpeedInsights {
  return {
    ...extra,
    lighthouseResult: { finalUrl: "https://example.com/", audits },
  } as unknown as PageSpeedInsights;
}

const verdictOf = (item: PageSpeedInsights, id: string) =>
  buildTriage(item).find((h) => h.id === id)?.verdict;

describe("buildTriage", () => {
  it("runs all 12 checks on the fixture, sorted by verdict then cost", () => {
    const result = buildTriage(example);
    expect(result).toHaveLength(12);
    const order = { confirmed: 0, contributes: 1, "ruled-out": 2 };
    const ranks = result.map((h) => order[h.verdict]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(result.every((h) => h.evidence.length <= 5)).toBe(true);
    expect(result.find((h) => h.id === "long-tasks")?.verdict).toBe("confirmed");
  });

  it("rules everything out without crashing when audits are missing", () => {
    const result = buildTriage({} as PageSpeedInsights);
    expect(result).toHaveLength(12);
    expect(result.every((h) => h.verdict === "ruled-out")).toBe(true);
    expect(result[0].summary).toBe("No data in this report.");
  });

  it("confirms a failing audit with >= 300 ms savings", () => {
    const item = report({
      "render-blocking-insight": {
        score: 0,
        scoreDisplayMode: "metricSavings",
        metricSavings: { FCP: 400 },
      },
    });
    expect(verdictOf(item, "render-blocking")).toBe("confirmed");
  });

  it("marks a failing audit with small savings as contributes", () => {
    const item = report({
      "render-blocking-insight": {
        score: 0.5,
        scoreDisplayMode: "metricSavings",
        metricSavings: { FCP: 100 },
      },
    });
    expect(verdictOf(item, "render-blocking")).toBe("contributes");
  });

  it("rules out a passing audit with no savings", () => {
    const item = report({
      "render-blocking-insight": {
        score: 1,
        scoreDisplayMode: "metricSavings",
        metricSavings: { FCP: 0 },
      },
    });
    expect(verdictOf(item, "render-blocking")).toBe("ruled-out");
  });

  it("confirms layout shifts from CLS savings", () => {
    const item = report({
      "cls-culprits-insight": {
        score: 0,
        scoreDisplayMode: "numeric",
        metricSavings: { CLS: 0.2 },
      },
    });
    const h = buildTriage(item).find((x) => x.id === "layout-shifts");
    expect(h?.verdict).toBe("confirmed");
    expect(h?.costCls).toBe(0.2);
  });

  it("caps caching at contributes", () => {
    const item = report({
      "cache-insight": { score: 0, scoreDisplayMode: "metricSavings", metricSavings: { LCP: 900 } },
    });
    const h = buildTriage(item).find((x) => x.id === "caching");
    expect(h?.verdict).toBe("contributes");
    expect(h?.summary).toContain("repeat visits");
  });

  it("confirms slow TTFB from lab or field", () => {
    const doc = { score: 1, scoreDisplayMode: "metricSavings" };
    const lab = report({
      "document-latency-insight": {
        ...doc,
        details: { type: "checklist", items: {}, debugData: { serverResponseTime: 900 } },
      },
    } as never);
    expect(verdictOf(lab, "slow-ttfb")).toBe("confirmed");

    const field = report(
      {
        "document-latency-insight": {
          ...doc,
          details: { type: "checklist", items: {}, debugData: { serverResponseTime: 100 } },
        },
      } as never,
      {
        loadingExperience: {
          metrics: { EXPERIMENTAL_TIME_TO_FIRST_BYTE: { percentile: 1200 } },
        },
      } as never,
    );
    expect(verdictOf(field, "slow-ttfb")).toBe("confirmed");
  });

  it("confirms long tasks from TBT >= 200 ms", () => {
    const item = report({
      "main-thread-tasks": {
        score: 1,
        scoreDisplayMode: "informative",
        details: { type: "table", items: [{ startTime: 0, duration: 400 }] },
      },
      "total-blocking-time": { numericValue: 350 },
    } as never);
    expect(verdictOf(item, "long-tasks")).toBe("confirmed");
  });
});

describe("triagePrompt", () => {
  it("includes only confirmed causes", () => {
    const item = report({
      "render-blocking-insight": {
        score: 0,
        scoreDisplayMode: "metricSavings",
        metricSavings: { FCP: 400 },
      },
      "unused-javascript": {
        score: 0,
        scoreDisplayMode: "metricSavings",
        metricSavings: { LCP: 10 },
      },
    });
    const prompt = triagePrompt(item, buildTriage(item));
    expect(prompt).toContain("CSS or scripts blocking");
    expect(prompt).not.toContain("unused JavaScript");
    expect(prompt).toContain("https://example.com/");
  });
});
