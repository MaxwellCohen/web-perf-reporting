import { describe, expect, it } from "vitest";
import exampleReport from "@/features/page-speed-insights/example-report.json";
import { buildAgentReport, renderAgentReportMarkdown } from "@/lib/agent/agentReport";
import type { PageSpeedDashboardItem } from "@/lib/page-speed-insights/types";

const items = exampleReport as unknown as PageSpeedDashboardItem[];

function build() {
  return buildAgentReport({
    publicId: "abc",
    url: "https://www.clearchoice.com",
    dashboardUrl: "https://example.test/page-speed/abc",
    items,
  });
}

describe("buildAgentReport", () => {
  it("summarizes scores, lab metrics, and field data per report", () => {
    const [desktop] = build().reports;
    expect(desktop.label).toBe("Desktop");
    expect(desktop.scores.performance).toBe(0.54);
    expect(desktop.lab.map((m) => m.acronym)).toEqual(["FCP", "LCP", "TBT", "CLS", "SI"]);
    expect(desktop.field?.source).toBe("url");
    expect(desktop.field?.metrics.find((m) => m.acronym === "CLS")).toEqual({
      acronym: "CLS",
      p75: "0.09",
      category: "FAST",
    });
  });

  it("lists failing audits from every category with examples, performance first", () => {
    const { issues } = build();
    const ids = issues.map((issue) => issue.id);

    expect(ids).toContain("unused-javascript");
    expect(ids).toContain("heading-order");
    expect(ids).toContain("link-text");
    // Lab metrics are reported separately, not as issues.
    expect(ids).not.toContain("largest-contentful-paint");
    expect(issues[0].category).toBe("performance");

    const heading = issues.find((issue) => issue.id === "heading-order");
    expect(heading?.examples[0]).toContain("h3.text-heroMedium");
    expect(heading?.reports).toEqual(["Desktop"]);
  });

  it("merges the same failing audit across reports", () => {
    const mobile = { ...items[0], label: "Mobile" };
    const report = buildAgentReport({
      publicId: "abc",
      url: "u",
      dashboardUrl: "d",
      items: [mobile, items[0]],
    });
    const unused = report.issues.filter((issue) => issue.id === "unused-javascript");
    expect(unused).toHaveLength(1);
    expect(unused[0].reports).toEqual(["Mobile", "Desktop"]);
  });

  it("renders markdown with scores, issues, and the fix plan", () => {
    const md = renderAgentReportMarkdown(build());
    expect(md).toContain("| Desktop | 54 |");
    expect(md).toContain("Real users (CrUX p75, url)");
    expect(md).toContain("`unused-javascript`");
    expect(md).toContain("## Fix plan");
    expect(md).toContain("Lock in the gains");
  });
});
