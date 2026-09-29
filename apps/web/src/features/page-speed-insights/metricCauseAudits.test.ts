import { describe, expect, it } from "vitest";
import type { AuditResult, AuditResultsRecord } from "@/lib/schema";
import {
  collectCauseAuditsForMetric,
  CURATED_CAUSE_AUDIT_IDS,
  METRIC_AUDIT_TO_ACRONYM,
} from "@/features/page-speed-insights/metricCauseAudits";

function audit(partial: Partial<AuditResult> & Pick<AuditResult, "id" | "title">): AuditResult {
  return {
    score: 0.5,
    scoreDisplayMode: "informative",
    details: { type: "table", headings: [], items: [] },
    ...partial,
  };
}

describe("METRIC_AUDIT_TO_ACRONYM", () => {
  it("maps each metric audit id to its savings acronym", () => {
    expect(METRIC_AUDIT_TO_ACRONYM["first-contentful-paint"]).toBe("FCP");
    expect(METRIC_AUDIT_TO_ACRONYM["largest-contentful-paint"]).toBe("LCP");
    expect(METRIC_AUDIT_TO_ACRONYM["total-blocking-time"]).toBe("TBT");
    expect(METRIC_AUDIT_TO_ACRONYM["cumulative-layout-shift"]).toBe("CLS");
    expect(METRIC_AUDIT_TO_ACRONYM["speed-index"]).toBe("SI");
  });
});

describe("collectCauseAuditsForMetric", () => {
  it("includes curated insights even when metricSavings is 0", () => {
    const audits: AuditResultsRecord = {
      "lcp-breakdown-insight": audit({
        id: "lcp-breakdown-insight",
        title: "LCP breakdown",
        metricSavings: { LCP: 0 },
      }),
    };

    const result = collectCauseAuditsForMetric("largest-contentful-paint", [
      { audits, label: "Mobile" },
    ]);

    expect(result.map((r) => r.auditId)).toEqual(["lcp-breakdown-insight"]);
    expect(result[0].maxSavings).toBe(0);
  });

  it("includes non-curated audits with metricSavings > 0", () => {
    const audits: AuditResultsRecord = {
      "server-response-time": audit({
        id: "server-response-time",
        title: "Reduce initial server response time",
        scoreDisplayMode: "metricSavings",
        metricSavings: { LCP: 400 },
      }),
    };

    const result = collectCauseAuditsForMetric("largest-contentful-paint", [
      { audits, label: "Mobile" },
    ]);

    expect(result.map((r) => r.auditId)).toEqual(["server-response-time"]);
    expect(result[0].maxSavings).toBe(400);
  });

  it("skips notApplicable audits and audits without details", () => {
    const audits: AuditResultsRecord = {
      "render-blocking-insight": audit({
        id: "render-blocking-insight",
        title: "Render blocking",
        scoreDisplayMode: "notApplicable",
        metricSavings: { FCP: 100 },
      }),
      "font-display-insight": audit({
        id: "font-display-insight",
        title: "Font display",
        details: undefined,
        metricSavings: { FCP: 50 },
      }),
    };

    const result = collectCauseAuditsForMetric("first-contentful-paint", [
      { audits, label: "Mobile" },
    ]);

    expect(result).toEqual([]);
  });

  it("skips non-curated audits with zero savings", () => {
    const audits: AuditResultsRecord = {
      "unrelated-audit": audit({
        id: "unrelated-audit",
        title: "Unrelated",
        metricSavings: { LCP: 0 },
      }),
    };

    expect(
      collectCauseAuditsForMetric("largest-contentful-paint", [{ audits, label: "M" }]),
    ).toEqual([]);
  });

  it("orders curated audits before savings-only audits", () => {
    const audits: AuditResultsRecord = {
      "zebra-opportunity": audit({
        id: "zebra-opportunity",
        title: "Zebra",
        metricSavings: { LCP: 100 },
      }),
      "lcp-breakdown-insight": audit({
        id: "lcp-breakdown-insight",
        title: "LCP breakdown",
        metricSavings: { LCP: 0 },
      }),
      "image-delivery-insight": audit({
        id: "image-delivery-insight",
        title: "Image delivery",
        metricSavings: { LCP: 200 },
      }),
    };

    const result = collectCauseAuditsForMetric("largest-contentful-paint", [
      { audits, label: "Mobile" },
    ]);

    expect(result.map((r) => r.auditId)).toEqual([
      "lcp-breakdown-insight",
      "image-delivery-insight",
      "zebra-opportunity",
    ]);
  });

  it("merges entries across reports and takes max savings", () => {
    const mobile: AuditResultsRecord = {
      "cls-culprits-insight": audit({
        id: "cls-culprits-insight",
        title: "Layout shift culprits",
        metricSavings: { CLS: 0.05 },
      }),
    };
    const desktop: AuditResultsRecord = {
      "cls-culprits-insight": audit({
        id: "cls-culprits-insight",
        title: "Layout shift culprits",
        metricSavings: { CLS: 0.12 },
      }),
    };

    const result = collectCauseAuditsForMetric("cumulative-layout-shift", [
      { audits: mobile, label: "Mobile" },
      { audits: desktop, label: "Desktop" },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].entries.map((e) => e.label)).toEqual(["Mobile", "Desktop"]);
    expect(result[0].maxSavings).toBe(0.12);
  });

  it("covers curated ids for TBT and Speed Index", () => {
    expect(CURATED_CAUSE_AUDIT_IDS["total-blocking-time"]).toContain("bootup-time");
    expect(CURATED_CAUSE_AUDIT_IDS["speed-index"]).toContain("unused-css-rules");
  });
});
