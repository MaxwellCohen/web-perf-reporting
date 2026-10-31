import { describe, expect, it } from "vitest";
import {
  extractLighthouseFromPsiShareHtml,
  labelForPsiLighthouse,
} from "@/lib/viewer/extractLighthouseFromPsiShareHtml";

function embed(report: object): string {
  return JSON.stringify(JSON.stringify(report));
}

function report(formFactor: string): {
  configSettings: { formFactor?: string; emulatedFormFactor?: string };
  [key: string]: unknown;
} {
  return {
    fetchTime: "2026-10-25T20:58:56.939Z",
    requestedUrl: "https://example.com/",
    lighthouseVersion: "13.5.0",
    audits: { "largest-contentful-paint": { numericValue: 1100 } },
    categories: { performance: { score: 0.9 } },
    configSettings: { formFactor },
  };
}

describe("extractLighthouseFromPsiShareHtml", () => {
  it("extracts mobile and desktop lighthouse results embedded as escaped JSON strings", () => {
    const html = `AF_initDataCallback(${embed(report("mobile"))});AF_initDataCallback(${embed(report("desktop"))});`;
    const reports = extractLighthouseFromPsiShareHtml(html);

    expect(reports).toHaveLength(2);
    expect(reports.map((item) => labelForPsiLighthouse(item, 0))).toEqual(["Mobile", "Desktop"]);
    expect(reports[0]?.lighthouseVersion).toBe("13.5.0");
    expect(reports[1]?.configSettings?.formFactor).toBe("desktop");
  });

  it("labels emulatedFormFactor when formFactor is missing", () => {
    const desktop = report("desktop");
    desktop.configSettings = { emulatedFormFactor: "desktop" };
    const html = embed(desktop);
    const [extracted] = extractLighthouseFromPsiShareHtml(html);
    expect(labelForPsiLighthouse(extracted!, 0)).toBe("Desktop");
  });
});
