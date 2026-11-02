import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { buildPageLoadTimelineBundle, modelCheckFor } from "./buildPageLoadTimeline";

function itemFromFixture(name: string): InsightsContextItem {
  const report = JSON.parse(
    readFileSync(join(__dirname, "lantern/fixtures", `${name}.json`), "utf8"),
  );
  return {
    label: name,
    item: {
      lighthouseResult: {
        audits: report.audits,
        configSettings: { formFactor: report.formFactor },
      },
    },
  } as unknown as InsightsContextItem;
}

describe("model check", () => {
  it("compares the replay's FCP and LCP to Lighthouse", () => {
    const check = modelCheckFor(itemFromFixture("wikipedia-mobile"));
    expect(check?.map((metric) => metric.label)).toEqual(["FCP", "LCP"]);
    const fcp = check![0]!;
    expect(fcp.lighthouseMs).toBeCloseTo(1080, -1);
    expect(fcp.error).toBeCloseTo((fcp.modelMs - fcp.lighthouseMs) / fcp.lighthouseMs, 6);
    expect(Math.abs(fcp.error)).toBeLessThan(0.3);
  });

  it("is attached to the timeline when throttling is simulated", () => {
    const bundle = buildPageLoadTimelineBundle(itemFromFixture("wikipedia-mobile"));
    expect(bundle?.timeline.modelCheck?.length).toBe(2);
  });

  it("is skipped without audits", () => {
    expect(
      modelCheckFor({ label: "x", item: {} } as unknown as InsightsContextItem),
    ).toBeUndefined();
  });
});
