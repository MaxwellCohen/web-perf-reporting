import { describe, expect, it } from "vitest";
import exampleReport from "../../../../../test-fixtures/example-report.json";
import {
  buildCulpritMatrix,
  culpritPrompt,
} from "@/features/page-speed-insights/dashboard-view/resources-story/culpritMatrixModel";
import type { PageSpeedDashboardItem } from "@/lib/page-speed-insights/types";
import type { PageSpeedInsights } from "@/lib/schema";

const fixture = (exampleReport as unknown as PageSpeedDashboardItem[])[0].item;

const PAGE = "https://example.com/";
const HERO = "https://example.com/hero.jpg";
const CSS = "https://example.com/app.css";
const SDK = "https://cdn.vendor.com/sdk.js";
const FONT = "https://example.com/font.woff2";

function stub(audits: Record<string, unknown>): PageSpeedInsights {
  return {
    loadingExperience: {
      overall_category: "SLOW",
      metrics: { LARGEST_CONTENTFUL_PAINT_MS: { percentile: 3200 } },
    },
    lighthouseResult: {
      finalUrl: PAGE,
      configSettings: { formFactor: "mobile" },
      entities: [
        { name: "example.com", isFirstParty: true, isUnrecognized: false, origins: [PAGE] },
        { name: "Vendor", isFirstParty: false, isUnrecognized: false, origins: [SDK] },
      ],
      audits: {
        "network-requests": {
          id: "network-requests",
          title: "Network",
          details: {
            type: "table",
            items: [
              { url: HERO, resourceType: "Image", transferSize: 5000, entity: "example.com" },
              { url: CSS, resourceType: "Stylesheet", transferSize: 2000, entity: "example.com" },
              { url: SDK, resourceType: "Script", transferSize: 9000, entity: "Vendor" },
              { url: FONT, resourceType: "Font", transferSize: 700, entity: "example.com" },
            ],
          },
        },
        ...audits,
      },
    },
  } as unknown as PageSpeedInsights;
}

const row = (m: ReturnType<typeof buildCulpritMatrix>, url: string) =>
  m.rows.find((r) => r.url === url)!;

describe("buildCulpritMatrix", () => {
  it("builds party-split rows from the example report", () => {
    const { rows, summary } = buildCulpritMatrix(fixture);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.party === "third")).toBe(true);
    expect(rows.some((r) => r.party === "first")).toBe(true);
    expect(summary.top).not.toBeNull();
    expect(summary.thirdParty.bytes).toBeGreaterThan(0);
    expect(summary.field.passed).toBe(true);
  });

  it("sorts by LCP then TBT", () => {
    const m = buildCulpritMatrix(
      stub({
        "render-blocking-insight": {
          id: "render-blocking-insight",
          title: "Render blocking",
          score: 0.5,
          details: { type: "table", items: [{ url: CSS, wastedMs: 300 }] },
        },
        "bootup-time": {
          id: "bootup-time",
          title: "Bootup",
          score: 0.5,
          details: { type: "table", items: [{ url: SDK, scripting: 800, total: 900 }] },
        },
      }),
    );
    expect(m.rows.map((r) => r.url)).toEqual([CSS, SDK]);
    expect(m.summary.tbtSource).toBe("bootup-time");
  });

  it("attributes LCP load time to the LCP image and render-blocking to FCP", () => {
    const m = buildCulpritMatrix(
      stub({
        "prioritize-lcp-image": {
          id: "prioritize-lcp-image",
          title: "LCP",
          score: 1,
          details: { type: "table", items: [{ url: HERO }] },
        },
        "lcp-breakdown-insight": {
          id: "lcp-breakdown-insight",
          title: "LCP",
          details: {
            type: "list",
            items: [
              {
                type: "table",
                items: [
                  { subpart: "resourceLoadDelay", duration: 400 },
                  { subpart: "resourceLoadDuration", duration: 600 },
                  { subpart: "elementRenderDelay", duration: 900 },
                ],
              },
            ],
          },
        },
        "render-blocking-insight": {
          id: "render-blocking-insight",
          title: "Render blocking",
          score: 0.5,
          details: { type: "table", items: [{ url: CSS, wastedMs: 250 }] },
        },
      }),
    );
    expect(row(m, HERO).lcpMs).toBe(1000);
    expect(row(m, CSS)).toMatchObject({ fcpMs: 250, lcpMs: 250 });
    expect(row(m, CSS).findings[0]).toMatchObject({ auditId: "render-blocking-insight" });
  });

  it("prefers long-task blocking per script over bootup-time", () => {
    const m = buildCulpritMatrix(
      stub({
        "main-thread-tasks": {
          id: "main-thread-tasks",
          title: "Tasks",
          details: {
            type: "table",
            items: [
              { url: SDK, duration: 200, startTime: 0 },
              { url: SDK, duration: 100, startTime: 300 },
            ],
          },
        },
        "bootup-time": {
          id: "bootup-time",
          title: "Bootup",
          score: 0.5,
          details: { type: "table", items: [{ url: SDK, scripting: 9999 }] },
        },
      }),
    );
    expect(row(m, SDK).tbtMs).toBe(200);
    expect(m.summary.tbtSource).toBe("long-tasks");
  });

  it("attributes layout shifts to the URL named as the cause", () => {
    const m = buildCulpritMatrix(
      stub({
        "cls-culprits-insight": {
          id: "cls-culprits-insight",
          title: "CLS culprits",
          score: 0.5,
          details: {
            type: "list",
            items: [
              {
                type: "table",
                items: [
                  { score: 0.2, node: { value: "Total" } },
                  {
                    score: 0.15,
                    subItems: {
                      items: [{ cause: "Web font", extra: { type: "url", value: FONT } }],
                    },
                  },
                ],
              },
            ],
          },
        },
      }),
    );
    expect(row(m, FONT).cls).toBeCloseTo(0.15);
    expect(m.summary.thirdParty.cls).toBe(0);
  });

  it("collects findings from table rows and third-party sub-items, with fixes", () => {
    const m = buildCulpritMatrix(
      stub({
        "unused-javascript": {
          id: "unused-javascript",
          title: "Unused JS",
          score: 0.4,
          details: { type: "table", items: [{ url: SDK, wastedBytes: 4096 }] },
        },
        "third-parties-insight": {
          id: "third-parties-insight",
          title: "Third parties",
          scoreDisplayMode: "informative",
          details: {
            type: "table",
            items: [{ entity: "Vendor", subItems: { items: [{ url: SDK, mainThreadTime: 120 }] } }],
          },
        },
      }),
    );
    const r = row(m, SDK);
    expect(r.findings.map((f) => f.auditId).sort()).toEqual([
      "third-parties-insight",
      "unused-javascript",
    ]);
    expect(r.findings.find((f) => f.auditId === "unused-javascript")).toMatchObject({
      saving: "4.0 KiB",
    });
    expect(r.findings.find((f) => f.auditId === "third-parties-insight")!.fix).toContain(
      "third-party",
    );
    expect(r.party).toBe("third");
    expect(m.summary.thirdParty.entities).toBe(1);
  });

  it("omits files with no cost or finding and builds a prompt for the rest", () => {
    const m = buildCulpritMatrix(
      stub({
        "unused-javascript": {
          id: "unused-javascript",
          title: "Unused JS",
          score: 0.4,
          details: { type: "table", items: [{ url: SDK, wastedBytes: 4096 }] },
        },
      }),
    );
    expect(m.rows.map((r) => r.url)).toEqual([SDK]);
    const prompt = culpritPrompt(m.rows[0], { url: PAGE, formFactor: "mobile" });
    expect(prompt).toContain(SDK);
    expect(prompt).toContain("Unused JS");
  });
});
