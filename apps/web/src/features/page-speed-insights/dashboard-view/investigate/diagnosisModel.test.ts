import { describe, expect, it } from "vitest";
import exampleReport from "../../../../../test-fixtures/example-report.json";
import {
  buildDiagnosis,
  worstPart,
} from "@/features/page-speed-insights/dashboard-view/investigate/diagnosisModel";
import type { PageSpeedDashboardItem } from "@/lib/page-speed-insights/types";
import type { PageSpeedInsights } from "@/lib/schema";

const fixture = (exampleReport as unknown as PageSpeedDashboardItem[])[0].item;

function stub(audits: Record<string, unknown>): PageSpeedInsights {
  const metric = (id: string, value: number, score: number, weight: number) => ({
    audit: {
      id,
      title: id,
      score,
      scoreDisplayMode: "numeric",
      numericValue: value,
      displayValue: `${value}`,
    },
    ref: { id, weight },
  });
  const metrics = [
    metric("first-contentful-paint", 1000, 0.9, 10),
    metric("largest-contentful-paint", 4000, 0.5, 25),
    metric("total-blocking-time", 600, 0.5, 30),
    metric("cumulative-layout-shift", 0.3, 0.4, 25),
    metric("speed-index", 3000, 0.9, 10),
  ];
  return {
    loadingExperience: { metrics: {} },
    originLoadingExperience: { metrics: {} },
    lighthouseResult: {
      finalUrl: "https://example.com/",
      configSettings: { formFactor: "mobile" },
      categories: { performance: { auditRefs: metrics.map((m) => m.ref) } },
      audits: { ...Object.fromEntries(metrics.map((m) => [m.audit.id, m.audit])), ...audits },
    },
  } as unknown as PageSpeedInsights;
}

describe("buildDiagnosis", () => {
  it("ranks the fixture's metrics by points lost with TBT first", () => {
    const d = buildDiagnosis(fixture);
    expect(d.formFactor).toBe("desktop");
    expect(d.metrics.map((m) => m.acronym)[0]).toBe("TBT");
    const pts = d.metrics.map((m) => m.pointsLost);
    expect(pts).toEqual([...pts].sort((a, b) => b - a));
    const tbt = d.metrics[0];
    expect(tbt.field?.label).toBe("INP");
    expect(tbt.parts.length).toBeGreaterThan(0);
    expect(worstPart(tbt)?.causes.length).toBeGreaterThan(0);
  });

  it("reports nothing to fix for a passing LCP subpart", () => {
    const lcp = buildDiagnosis(fixture).metrics.find((m) => m.acronym === "LCP")!;
    const ttfb = lcp.parts.find((p) => p.id === "LCP:timeToFirstByte")!;
    expect(ttfb.status).toBe("good");
    expect(ttfb.causes[0].title).toBe("Nothing to fix here");
    expect(ttfb.causes[0].savingDisplay).toBe("no action");
  });

  it("maps LCP subparts to their audits", () => {
    const item = stub({
      "lcp-breakdown-insight": {
        id: "lcp-breakdown-insight",
        title: "LCP breakdown",
        score: 1,
        scoreDisplayMode: "informative",
        details: {
          type: "list",
          items: [
            {
              type: "table",
              items: [
                { subpart: "timeToFirstByte", duration: 1900, label: "Time to first byte" },
                { subpart: "resourceLoadDuration", duration: 1500, label: "Load duration" },
              ],
            },
          ],
        },
      },
      "document-latency-insight": {
        id: "document-latency-insight",
        title: "Document request latency",
        score: 0,
        scoreDisplayMode: "metricSavings",
        metricSavings: { LCP: 900 },
        details: {
          type: "checklist",
          items: { serverResponseIsFast: { value: false, label: "Server responds slowly" } },
          debugData: { serverResponseTime: 1900 },
        },
      },
      "image-delivery-insight": {
        id: "image-delivery-insight",
        title: "Improve image delivery",
        score: 0.5,
        scoreDisplayMode: "metricSavings",
        metricSavings: { LCP: 300 },
        details: {
          type: "table",
          items: [{ url: "https://example.com/hero.png", wastedBytes: 50000 }],
        },
      },
    });
    const lcp = buildDiagnosis(item).metrics.find((m) => m.acronym === "LCP")!;
    const [ttfb, load] = lcp.parts;
    expect(ttfb.status).toBe("poor");
    expect(ttfb.causes[0]).toMatchObject({
      auditId: "document-latency-insight",
      savingDisplay: "-900 ms",
    });
    expect(ttfb.causes[0].evidence).toContainEqual({ k: "Server response", v: "1.90 s" });
    expect(load.causes[0].auditId).toBe("image-delivery-insight");
  });

  it("splits TBT by script with Other and attaches matching rows", () => {
    const tasks = Array.from({ length: 8 }, (_, i) => ({
      url: `https://cdn.example.com/s${i}.js`,
      duration: 400 - i * 40,
    }));
    const item = stub({
      "main-thread-tasks": {
        id: "main-thread-tasks",
        title: "Tasks",
        score: 1,
        scoreDisplayMode: "informative",
        details: { type: "table", items: tasks },
      },
      "unused-javascript": {
        id: "unused-javascript",
        title: "Reduce unused JavaScript",
        score: 0,
        scoreDisplayMode: "metricSavings",
        details: {
          type: "opportunity",
          items: [{ url: "https://cdn.example.com/s0.js", wastedBytes: 90000, totalBytes: 120000 }],
        },
      },
    });
    const tbt = buildDiagnosis(item).metrics.find((m) => m.acronym === "TBT")!;
    expect(tbt.parts).toHaveLength(7);
    expect(tbt.parts.at(-1)?.label).toBe("Other");
    expect(tbt.parts[0].value).toBe(350);
    expect(tbt.parts[0].causes[0].auditId).toBe("unused-javascript");
  });

  it("lists CLS culprits and skips the Total row", () => {
    const item = stub({
      "cls-culprits-insight": {
        id: "cls-culprits-insight",
        title: "Layout shift culprits",
        score: 0,
        scoreDisplayMode: "informative",
        details: {
          type: "list",
          items: [
            {
              type: "table",
              items: [
                { score: 0.3, node: { value: "Total", type: "text" } },
                { score: 0.3, node: { nodeLabel: "Hero banner", selector: "div.hero" } },
              ],
            },
          ],
        },
      },
    });
    const cls = buildDiagnosis(item).metrics.find((m) => m.acronym === "CLS")!;
    expect(cls.parts).toHaveLength(1);
    expect(cls.parts[0]).toMatchObject({ label: "Hero banner", status: "poor" });
    expect(cls.parts[0].causes[0].auditId).toBe("cls-culprits-insight");
  });

  it("handles a report with no lighthouse audits", () => {
    expect(buildDiagnosis({} as PageSpeedInsights).metrics).toEqual([]);
  });
});
