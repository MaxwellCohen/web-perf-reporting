import { describe, expect, it } from "vitest";
import type { JSMetrics } from "@/features/page-speed-insights/javascript-metrics/extractJSMetrics";
import type { JSStats } from "@/features/page-speed-insights/javascript-metrics/javascriptMetricsSelectors";
import { javascriptStoryFromMetrics } from "@/features/page-speed-insights/dashboard-view/javascript-story/javascriptStoryModel";

function metric(label: string, overrides: Partial<JSMetrics> = {}): JSMetrics {
  return {
    label,
    bootupTime: [],
    mainThreadWork: [],
    unusedJS: [],
    unminifiedJS: [],
    legacyJS: [],
    diagnostics: [],
    mainThreadTasks: [],
    jsResources: [],
    ...overrides,
  };
}

function stats(label: string, totalTransferSize = 0, totalScripts = totalTransferSize > 0 ? 1 : 0): JSStats {
  return {
    label,
    totalScripts,
    totalTransferSize,
    totalResourceSize: 0,
  };
}

describe("javascriptStoryFromMetrics", () => {
  it("sums transfer size, main-thread durations, long-task time, and unused bytes per report", () => {
    const story = javascriptStoryFromMetrics({
      jsMetrics: [
        metric("Mobile", {
          mainThreadWork: [
            { group: "scriptEvaluation", groupLabel: "Script Evaluation", duration: 100 },
            { group: "styleLayout", groupLabel: "Style & Layout", duration: 50 },
            { group: "other", groupLabel: "Other", duration: 0.5 },
          ],
          mainThreadTasks: [{ duration: 80 }, { duration: 25 }],
          unusedJS: [{ url: "https://example.com/app.js", wastedBytes: 400 }, { url: "inline", wastedBytes: 100 }],
        }),
        metric("Desktop", {
          diagnostics: [{ totalTaskTime: 200 }],
          mainThreadTasks: [{ duration: 50 }],
          mainThreadWork: [{ group: "scriptEvaluation", groupLabel: "Script Evaluation", duration: 10 }],
          unusedJS: [{ url: "https://example.com/desktop.js", unusedBytes: 30 }],
        }),
      ],
      jsStats: [stats("Mobile", 3000, 2), stats("Desktop", 1000, 1)],
    });

    expect(story?.reports.map((report) => report.label)).toEqual(["Mobile", "Desktop"]);
    expect(story?.reports.map((report) => report.values.transfer)).toEqual([3000, 1000]);
    expect(story?.reports[0].values.mainThread).toBe(150.5);
    expect(story?.reports[0].values.longTasks).toBe(105);
    expect(story?.reports[0].values.unused).toBe(500);
    expect(story?.reports[0].categories).toEqual([
      { id: "scriptEvaluation", label: "Script Evaluation", durationMs: 100 },
      { id: "styleLayout", label: "Style & Layout", durationMs: 50 },
    ]);
    expect(story?.reports[1].values.mainThread).toBe(10);
    expect(story?.reports[1].values.longTasks).toBe(200);
    expect(story?.reports[1].values.unused).toBe(30);
    expect(story?.facts.map((fact) => fact.id)).toEqual([
      "transfer",
      "mainThread",
      "longTasks",
      "unused",
    ]);
  });

  it("omits unused bytes when no row has wastedBytes or unusedBytes", () => {
    const story = javascriptStoryFromMetrics({
      jsMetrics: [
        metric("Mobile", {
          mainThreadWork: [{ group: "scriptEvaluation", groupLabel: "Script Evaluation", duration: 20 }],
          unusedJS: [
            { url: "https://example.com/app.js" },
            { url: "https://example.com/vendor.js", wastedPercent: 40, totalBytes: 5000 },
          ],
        }),
      ],
      jsStats: [stats("Mobile", 1000)],
    });

    expect(story?.facts.map((fact) => fact.id)).not.toContain("unused");
    expect(story?.reports[0].values.unused).toBeUndefined();

    expect(
      javascriptStoryFromMetrics({
        jsMetrics: [metric("Mobile", { unusedJS: [{ url: "https://example.com/app.js" }] })],
        jsStats: [stats("Mobile")],
      }),
    ).toBeNull();
  });

  it("returns null for null and empty input", () => {
    expect(javascriptStoryFromMetrics(null)).toBeNull();
    expect(javascriptStoryFromMetrics({ jsMetrics: null, jsStats: null })).toBeNull();
    expect(javascriptStoryFromMetrics({ jsMetrics: [], jsStats: [] })).toBeNull();
    expect(
      javascriptStoryFromMetrics({
        jsMetrics: [metric("Mobile")],
        jsStats: [stats("Mobile")],
      }),
    ).toBeNull();
  });
});
