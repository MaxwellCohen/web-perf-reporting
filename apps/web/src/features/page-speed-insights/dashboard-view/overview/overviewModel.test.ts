import { describe, expect, it } from "vitest";
import type { AuditResult, AuditResultsRecord } from "@/lib/schema";
import {
  allOpenKeys,
  buildOverviewModel,
  causeKey,
  defaultOpenKeys,
  metricSectionKey,
  rankTopFixes,
} from "@/features/page-speed-insights/dashboard-view/overview/overviewModel";

function audit(id: string, metricSavings: AuditResult["metricSavings"]): AuditResult {
  return {
    id,
    title: id,
    score: 0.5,
    scoreDisplayMode: "metricSavings",
    details: { type: "table", headings: [], items: [{ url: "https://example.com" }] },
    metricSavings,
  };
}

function record(...audits: AuditResult[]): AuditResultsRecord {
  return Object.fromEntries(audits.map((entry) => [entry.id, entry]));
}

const mobile = record(
  audit("render-blocking", { FCP: 300, LCP: 900 }),
  audit("server-response", { FCP: 100, LCP: 100 }),
  audit("slow-image", { LCP: 500 }),
  audit("long-script", { TBT: 250 }),
);
const model = buildOverviewModel([
  { audits: mobile, label: "Mobile" },
  { audits: record(audit("render-blocking", { FCP: 50, LCP: 60 })), label: "Desktop" },
]);

function metric(acronym: string) {
  return model.metrics.find((entry) => entry.acronym === acronym)!;
}

describe("buildOverviewModel", () => {
  it("shows a shared cause in full under the first metric and links it from later ones", () => {
    expect(metric("FCP").own.map((cause) => cause.auditId)).toEqual([
      "render-blocking",
      "server-response",
    ]);
    expect(metric("LCP").own.map((cause) => cause.auditId)).toEqual(["slow-image"]);
    expect(metric("LCP").refs.map((ref) => [ref.cause.auditId, ref.home])).toEqual([
      ["render-blocking", "first-contentful-paint"],
      ["server-response", "first-contentful-paint"],
    ]);
    expect(model.homeOf.get("render-blocking")).toBe("first-contentful-paint");
  });

  it("has no section for a metric without causes or context", () => {
    expect(metric("TBT").hasSection).toBe(true);
    expect(metric("CLS").hasSection).toBe(false);
  });
});

describe("rankTopFixes", () => {
  it("ranks causes by their largest saving on the focused report", () => {
    expect(rankTopFixes(model, "Mobile")).toEqual([
      { auditId: "render-blocking", title: "render-blocking", savingsMs: 900, acronym: "LCP" },
      { auditId: "slow-image", title: "slow-image", savingsMs: 500, acronym: "LCP" },
      { auditId: "long-script", title: "long-script", savingsMs: 250, acronym: "TBT" },
    ]);
  });

  it("uses only the focused report's savings", () => {
    expect(rankTopFixes(model, "Desktop")).toEqual([
      { auditId: "render-blocking", title: "render-blocking", savingsMs: 60, acronym: "LCP" },
    ]);
  });
});

describe("defaultOpenKeys", () => {
  it("opens the sections and causes that have savings", () => {
    const keys = defaultOpenKeys(model, false);
    expect(keys).toEqual(
      expect.arrayContaining([
        "timeline",
        "cwv",
        metricSectionKey("first-contentful-paint"),
        metricSectionKey("largest-contentful-paint"),
        metricSectionKey("total-blocking-time"),
        causeKey("render-blocking"),
        causeKey("slow-image"),
        causeKey("long-script"),
      ]),
    );
    expect(keys).not.toContain("Screenshots");
    expect(keys).not.toContain(metricSectionKey("cumulative-layout-shift"));
  });

  it("opens only the two largest causes on a phone", () => {
    const causes = defaultOpenKeys(model, true).filter((key) => key.startsWith("cause-"));
    expect(causes).toEqual([causeKey("slow-image"), causeKey("render-blocking")]);
  });
});

describe("allOpenKeys", () => {
  it("adds the reference sections and every cause", () => {
    const keys = allOpenKeys(model);
    expect(keys).toEqual(
      expect.arrayContaining(["Screenshots", "speedUpPrompt", causeKey("server-response")]),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});
