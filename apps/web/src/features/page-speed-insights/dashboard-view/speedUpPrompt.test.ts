import { describe, expect, it } from "vitest";
import exampleReport from "@/features/page-speed-insights/example-report.json";
import { buildSpeedUpPrompt } from "@/features/page-speed-insights/dashboard-view/speedUpPrompt";
import type { PageSpeedDashboardItem } from "@/lib/page-speed-insights/types";

const example = exampleReport as unknown as PageSpeedDashboardItem[];

function reportWith(audits: Record<string, unknown>): PageSpeedDashboardItem[] {
  return [
    {
      label: "Mobile",
      item: {
        lighthouseResult: { audits },
      } as unknown as PageSpeedDashboardItem["item"],
    },
  ];
}

describe("buildSpeedUpPrompt", () => {
  it("only includes focus areas backed by failing audits in the report", () => {
    const prompt = buildSpeedUpPrompt(example);
    const ids = prompt.focusAreas.map((area) => area.id);

    expect(ids).toContain("javascript");
    expect(ids).toContain("third-parties");
    expect(ids).toContain("caching");
    // render-blocking-insight has no items and CLS is good in the example report.
    expect(ids).not.toContain("cls");
  });

  it("quotes real offenders and report context in the prompt text", () => {
    const { text } = buildSpeedUpPrompt(example);

    expect(text).toContain("YouTube");
    expect(text).toContain("LCP breakdown: Time to first byte");
    expect(text).toContain("inline <style>/<script>");
    expect(text).toContain("Total Blocking Time");
    expect(text).toContain("Real users (CrUX p75)");
    expect(text).toContain("## 1. Measure correctly");
    expect(text).toContain("Lock in the gains");
  });

  it("detects a text LCP element and gives text-specific advice", () => {
    const prompt = buildSpeedUpPrompt(
      reportWith({
        "largest-contentful-paint": {
          id: "largest-contentful-paint",
          title: "Largest Contentful Paint",
          score: 0.3,
          scoreDisplayMode: "numeric",
          displayValue: "4.2 s",
        },
        "lcp-breakdown-insight": {
          id: "lcp-breakdown-insight",
          title: "LCP breakdown",
          score: 1,
          scoreDisplayMode: "informative",
          details: {
            type: "list",
            items: [
              {
                type: "node",
                nodeLabel: "Welcome",
                snippet: '<h1 class="hero">',
              },
            ],
          },
        },
      }),
    );

    const lcp = prompt.focusAreas.find((area) => area.id === "lcp");
    expect(lcp?.evidence.join("\n")).toContain("LCP element: Welcome");
    expect(lcp?.advice.join("\n")).toContain("The LCP element is text");
  });

  it("falls back to a maintenance prompt when nothing is failing", () => {
    const prompt = buildSpeedUpPrompt(reportWith({}));
    expect(prompt.focusAreas).toEqual([]);
    expect(prompt.text).toContain("No significant issues were found");
  });
});
