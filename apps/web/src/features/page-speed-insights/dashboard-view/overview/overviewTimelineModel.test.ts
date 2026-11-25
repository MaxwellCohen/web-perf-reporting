import { describe, expect, it } from "vitest";
import { buildOverviewTimeline } from "@/features/page-speed-insights/dashboard-view/overview/overviewTimelineModel";
import type { CombinedLoad } from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";

function load(partial: Partial<CombinedLoad>): CombinedLoad {
  return {
    requests: [],
    longTasks: [],
    lcpSegments: [],
    layoutShifts: [],
    screenshots: [],
    ...partial,
  } as CombinedLoad;
}

const full = load({
  fcp: 1200,
  fcpRating: "good",
  lcp: 3400,
  lcpRating: "poor",
  ttfb: 600,
  requests: [
    {
      url: "https://example.com/a.css",
      renderBlocking: "blocking",
      networkRequestTime: 650,
      networkEndTime: 900,
    },
    {
      url: "https://example.com/b.js",
      renderBlocking: "blocking",
      networkRequestTime: 700,
      networkEndTime: 1100,
    },
    {
      url: "https://example.com/c.js",
      renderBlocking: "non_blocking",
      networkRequestTime: 100,
      networkEndTime: 5000,
    },
  ] as CombinedLoad["requests"],
  longTasks: [
    { url: "https://example.com/app.js", startTime: 1500, duration: 300 },
  ] as CombinedLoad["longTasks"],
  lcpSegments: [
    { subpart: "timeToFirstByte", label: "TTFB", durationMs: 600, startMs: 0, endMs: 600 },
    {
      subpart: "resourceLoadDelay",
      label: "Load delay",
      durationMs: 2800,
      startMs: 600,
      endMs: 3400,
    },
  ] as CombinedLoad["lcpSegments"],
  layoutShifts: [
    { startTime: 2000, score: 0.12, nodeLabel: "Hero" },
  ] as CombinedLoad["layoutShifts"],
  screenshots: [
    { timing: 1000, data: "data:a" },
    { timing: 3000, data: "data:b" },
  ] as CombinedLoad["screenshots"],
});

describe("buildOverviewTimeline", () => {
  it("returns null when the report has nothing to place on the axis", () => {
    expect(buildOverviewTimeline(load({}), new Set())).toBeNull();
  });

  it("rounds the axis up to a readable end and marks FCP and LCP", () => {
    const timeline = buildOverviewTimeline(full, new Set())!;
    expect(timeline.endMs).toBe(4000);
    expect(timeline.ticks).toEqual([0, 1000, 2000, 3000]);
    expect(timeline.marks).toEqual([
      { id: "fcp", label: "FCP", timeMs: 1200, rating: "good" },
      { id: "lcp", label: "LCP", timeMs: 3400, rating: "poor" },
    ]);
  });

  it("merges the render-blocking requests into one bar", () => {
    const timeline = buildOverviewTimeline(full, new Set())!;
    const lane = timeline.lanes.find((entry) => entry.id === "render-blocking")!;
    expect(lane.segments).toHaveLength(1);
    expect(lane.segments[0]).toMatchObject({
      startMs: 650,
      endMs: 1100,
      label: "2 blocking requests",
    });
  });

  it("links a bar to a cause only when the Overview shows that cause", () => {
    const timeline = buildOverviewTimeline(
      full,
      new Set(["render-blocking-insight", "lcp-breakdown-insight", "main-thread-tasks"]),
    )!;
    const causeOf = (laneId: string) =>
      timeline.lanes.find((lane) => lane.id === laneId)!.segments.map((s) => s.causeId);

    expect(causeOf("render-blocking")).toEqual(["render-blocking-insight"]);
    expect(causeOf("lcp")).toEqual(["lcp-breakdown-insight", "lcp-breakdown-insight"]);
    expect(causeOf("main-thread")).toEqual(["main-thread-tasks"]);
    expect(causeOf("document")).toEqual([undefined]);
    expect(causeOf("layout-shifts")).toEqual([undefined]);
  });

  it("fills each screenshot slot with the last frame painted by then", () => {
    const timeline = buildOverviewTimeline(full, new Set())!;
    expect(timeline.frames).toHaveLength(10);
    expect(timeline.frames.map(({ frame }) => frame?.data ?? null)).toEqual([
      null,
      null,
      "data:a",
      "data:a",
      "data:a",
      "data:a",
      "data:a",
      "data:b",
      "data:b",
      "data:b",
    ]);
  });
});
