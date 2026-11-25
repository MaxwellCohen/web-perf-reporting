import { describe, expect, it } from "vitest";
import exampleReport from "../../../../test-fixtures/example-report.json";
import type { PageSpeedDashboardItem } from "@/lib/page-speed-insights/types";
import { collectTimelineSources } from "./collectTimelineSources";
import { buildExplainView, EXPLAIN_MODES } from "./explainMetricModel";
import type { CombinedLoad, CombinedRequest } from "./timelineSourceTypes";

const example = exampleReport as unknown as PageSpeedDashboardItem[];

function request(over: Partial<CombinedRequest>): CombinedRequest {
  return {
    url: "https://example.com/x",
    networkRequestTime: 0,
    networkEndTime: 100,
    renderBlocking: "non-blocking",
    isCriticalChain: false,
    ...over,
  };
}

function stubLoad(over: Partial<CombinedLoad> = {}): CombinedLoad {
  const document = request({
    url: "https://example.com/",
    resourceType: "Document",
    networkEndTime: 200,
  });
  return {
    label: "stub",
    fcp: 1000,
    lcp: 3000,
    interactive: 5000,
    ttfbObserved: false,
    document,
    requests: [
      document,
      request({
        url: "https://example.com/a.css",
        resourceType: "Stylesheet",
        networkRequestTime: 200,
        networkEndTime: 600,
        renderBlocking: "blocking",
      }),
      request({
        url: "https://example.com/hero.png",
        resourceType: "Image",
        networkRequestTime: 1800,
        networkEndTime: 2600,
      }),
    ],
    redirectHops: [],
    redirectAuditUrls: [],
    longTasks: [
      { url: "https://example.com/in.js", startTime: 1500, duration: 300 },
      { url: "https://example.com/out.js", startTime: 6000, duration: 300 },
    ],
    userTimings: [],
    screenshots: [],
    lcpSegments: [
      { subpart: "timeToFirstByte", label: "TTFB", durationMs: 200, startMs: 0, endMs: 200 },
      {
        subpart: "resourceLoadDelay",
        label: "Load delay",
        durationMs: 1600,
        startMs: 200,
        endMs: 1800,
      },
      {
        subpart: "resourceLoadDuration",
        label: "Load duration",
        durationMs: 800,
        startMs: 1800,
        endMs: 2600,
      },
      {
        subpart: "elementRenderDelay",
        label: "Render delay",
        durationMs: 400,
        startMs: 2600,
        endMs: 3000,
      },
    ],
    lcpDiscoveryFailures: [],
    layoutShifts: [],
    preconnectCandidates: [],
    ...over,
  };
}

describe("buildExplainView (fixture)", () => {
  const load = collectTimelineSources(example[0])!;
  it.each(EXPLAIN_MODES)("builds %s with a relevant row and markers", (mode) => {
    const view = buildExplainView(load, mode, example[0].item.lighthouseResult?.audits);
    expect(view.headline).toBeTruthy();
    expect(view.rows.length).toBeGreaterThan(0);
    expect(view.rows.some((r) => r.relevant)).toBe(true);
    expect(view.markers.length).toBeGreaterThan(0);
    expect(view.ticks.length).toBeGreaterThan(1);
  });
});

describe("buildExplainView (stubs)", () => {
  it("marks render-blocking requests relevant for FCP", () => {
    const view = buildExplainView(stubLoad(), "FCP");
    const css = view.rows.find((r) => r.name.includes("a.css"))!;
    expect(css.relevant).toBe(true);
    expect(css.note).toContain("render-blocking");
    expect(view.rows.find((r) => r.name.includes("hero.png"))!.relevant).toBe(false);
  });

  it("marks only long tasks in the blocking window relevant for TBT", () => {
    const view = buildExplainView(stubLoad(), "TBT");
    expect(view.rows.find((r) => r.name.includes("in.js") && r.kind === "task")!.relevant).toBe(
      true,
    );
    expect(view.rows.find((r) => r.name.includes("out.js") && r.kind === "task")!.relevant).toBe(
      false,
    );
  });

  it("marks the LCP resource relevant with a note, and phases sum to LCP", () => {
    const view = buildExplainView(stubLoad(), "LCP");
    const hero = view.rows.find((r) => r.name.includes("hero.png"))!;
    expect(hero.relevant).toBe(true);
    expect(hero.note).toContain("LCP resource");
    const total = view.phases.reduce((sum, p) => sum + (p.endMs - p.startMs), 0);
    expect(total).toBeCloseTo(3000, -1);
    expect(view.headline).toContain("started late");
  });

  it("returns details with a fix and audit id", () => {
    const view = buildExplainView(stubLoad(), "FCP");
    const css = view.rows.find((r) => r.name.includes("a.css"))!;
    const details = view.details(css.id)!;
    expect(details.auditId).toBe("render-blocking-insight");
    expect(details.fix).toContain("render-blocking");
  });
});
