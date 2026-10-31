import { describe, expect, it } from "vitest";
import type { AuditResult } from "@/lib/schema";
import { collectPlatformNotes } from "@/features/page-speed-insights/dashboard-view/collectPlatformNotes";

function baselineAudit(items: unknown[]): AuditResult {
  return {
    id: "baseline",
    title: "Baseline Features",
    description:
      "Lists web features used on the page and their Baseline status as of 2026-09-17. [Learn more about Baseline](https://webstatus.dev/).",
    score: 1,
    scoreDisplayMode: "informative",
    details: {
      type: "table",
      headings: [],
      items: items as never,
    },
  };
}

describe("collectPlatformNotes", () => {
  it("returns null when neither audit is present", () => {
    expect(collectPlatformNotes({})).toBeNull();
    expect(collectPlatformNotes(undefined)).toBeNull();
  });

  it("summarizes limited and newly available features and counts the rest", () => {
    const items = [
      {
        featureId: { type: "link", text: "popover", url: "https://webstatus.dev/features/popover" },
        displayStatus: {
          type: "baseline-status",
          status: "limited",
          displayString: "Limited Availability",
        },
      },
      {
        featureId: {
          type: "link",
          text: "field-sizing",
          url: "https://webstatus.dev/features/field-sizing",
        },
        displayStatus: {
          type: "baseline-status",
          status: "low",
          displayString: "Newly Available (2026-02-01)",
        },
      },
      {
        featureId: { type: "link", text: "grid", url: "https://webstatus.dev/features/grid" },
        displayStatus: {
          type: "baseline-status",
          status: "high",
          displayString: "Widely Available (2023-01-01)",
        },
      },
    ];
    const audit = baselineAudit(items);
    if (audit.details && audit.details.type === "table") {
      audit.details.debugData = {
        type: "debugdata",
        details: { items: [] },
        newestFeatureId: "field-sizing",
        newestFeatureYear: "2026",
      };
    }
    const notes = collectPlatformNotes({
      baseline: audit,
    });

    expect(notes?.baseline?.asOf).toBe("2026-09-17");
    expect(notes?.baseline?.counts).toEqual({ limited: 1, newly: 1, widely: 1 });
    expect(notes?.baseline?.highlighted.map((feature) => feature.id)).toEqual([
      "popover",
      "field-sizing",
    ]);
    expect(notes?.baseline?.highlighted[0]?.href).toBe("https://webstatus.dev/features/popover");
    expect(notes?.baseline?.newest).toEqual({ id: "field-sizing", year: "2026" });
    expect(notes?.csp).toEqual([]);
  });

  it("keeps CSP findings when the audit score is passing", () => {
    const notes = collectPlatformNotes({
      "csp-xss": {
        id: "csp-xss",
        title: "Ensure CSP is effective against XSS attacks",
        score: 1,
        scoreDisplayMode: "informative",
        details: {
          type: "table",
          headings: [],
          items: [
            {
              description: "No CSP found in enforcement mode",
              severity: "High",
            },
            {
              description: { type: "code", value: "default-src *" },
              severity: "Syntax",
              subItems: {
                type: "subitems",
                items: [
                  { description: "Missing object-src", directive: "object-src", severity: "High" },
                ],
              },
            },
          ],
        },
      },
    });

    expect(notes?.baseline).toBeNull();
    expect(notes?.csp).toEqual([
      { description: "No CSP found in enforcement mode", severity: "High", directive: null },
      { description: "default-src *", severity: "Syntax", directive: null },
      { description: "Missing object-src", severity: "High", directive: "object-src" },
    ]);
  });

  it("ignores not applicable audits", () => {
    expect(
      collectPlatformNotes({
        "csp-xss": {
          id: "csp-xss",
          title: "Ensure CSP is effective against XSS attacks",
          score: null,
          scoreDisplayMode: "notApplicable",
        },
      }),
    ).toBeNull();
  });
});
