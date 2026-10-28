import { describe, expect, it } from "vitest";
import {
  compareResourcesInvestigations,
  formatMetricDelta,
} from "@/features/page-speed-insights/dashboard-view/resources-story/resourcesComparisonModel";
import {
  buildResourcesInvestigation,
  type ResourcesInvestigationInput,
} from "@/features/page-speed-insights/dashboard-view/resources-story/resourcesInvestigationModel";

const KB = 1024;

function investigation(overrides: Partial<ResourcesInvestigationInput>) {
  const built = buildResourcesInvestigation({
    label: "Mobile",
    totalBytes: null,
    requestCount: null,
    thirdPartyBytes: null,
    scriptBytes: null,
    unusedBytes: null,
    mainThreadMs: null,
    longTaskMs: null,
    loadTimeMs: null,
    requests: [],
    scripts: [],
    ...overrides,
  });
  if (!built) throw new Error("expected an investigation");
  return built;
}

describe("compareResourcesInvestigations", () => {
  const a = investigation({
    label: "Before · Mobile",
    totalBytes: 300 * KB,
    requestCount: 3,
    mainThreadMs: 1200,
    requests: [
      { url: "https://a.com/app.js", resourceType: "Script", transferSize: 200 * KB },
      { url: "https://a.com/old.js", resourceType: "Script", transferSize: 100 * KB },
    ],
  });
  const b = investigation({
    label: "After · Mobile",
    totalBytes: 250 * KB,
    requestCount: 3,
    requests: [
      { url: "https://a.com/app.js", resourceType: "Script", transferSize: 150 * KB },
      { url: "https://a.com/hero.jpg", resourceType: "Image", transferSize: 100 * KB },
    ],
  });
  const result = compareResourcesInvestigations(a, b);

  it("diffs the measures both reports have", () => {
    const byId = Object.fromEntries(result.metrics.map((row) => [row.id, row]));
    expect(byId.transferBytes?.delta).toBe(-50 * KB);
    expect(byId.requestCount?.delta).toBe(0);
    expect(byId.scriptBytes).toMatchObject({ a: 300 * KB, b: 150 * KB, delta: -150 * KB });
    expect(byId.mainThreadMs).toMatchObject({ a: 1200, b: null, delta: null });
    expect(byId.unusedBytes).toBeUndefined();
  });

  it("tags suspects that appear in only one report", () => {
    expect(result.tagInA("https://a.com/app.js")).toBeNull();
    expect(result.tagInA("https://a.com/old.js")).toBe("dropped");
    expect(result.tagInB("https://a.com/hero.jpg")).toBe("new");
  });
});

describe("formatMetricDelta", () => {
  it("signs deltas and handles missing values", () => {
    expect(formatMetricDelta(2048, "bytes")).toBe("+2.0 KiB");
    expect(formatMetricDelta(-250, "ms")).toBe("−250 ms");
    expect(formatMetricDelta(0, "count")).toBe("±0");
    expect(formatMetricDelta(null, "count")).toBe("—");
  });
});
