import { describe, expect, it } from "vitest";
import {
  buildMainThreadWorkTable,
  buildMainThreadWorkTableFromDetailRows,
} from "@/features/page-speed-insights/javascript-metrics/mainThreadWorkTable";
import type { TableItem } from "@/lib/schema";

function item(groupLabel: string, duration: number, group: string): TableItem {
  return { group, groupLabel, duration };
}

describe("buildMainThreadWorkTable", () => {
  it("puts each report duration in its own column on one category row", () => {
    const result = buildMainThreadWorkTable([
      {
        label: "Desktop",
        mainThreadWork: [
          item("Parse HTML & CSS", 8, "parseHTML"),
          item("Rendering", 11, "paintCompositeRender"),
        ],
      },
      {
        label: "Mobile",
        mainThreadWork: [
          item("Parse HTML & CSS", 9, "parseHTML"),
          item("Rendering", 8, "paintCompositeRender"),
        ],
      },
    ]);

    expect(result.reportLabels).toEqual(["Mobile", "Desktop"]);
    expect(result.rows).toEqual([
      {
        category: "Parse HTML & CSS",
        valuesByReportLabel: { Mobile: 9, Desktop: 8 },
      },
      {
        category: "Rendering",
        valuesByReportLabel: { Mobile: 8, Desktop: 11 },
      },
    ]);
  });

  it("sorts categories in main-thread pipeline order, not by duration", () => {
    const result = buildMainThreadWorkTable([
      {
        label: "Mobile",
        mainThreadWork: [
          item("Script Evaluation", 2700, "scriptEvaluation"),
          item("Other", 347, "other"),
          item("Style & Layout", 249, "styleLayout"),
          item("Script Parsing & Compilation", 406, "scriptParseCompile"),
          item("Garbage Collection", 200, "garbageCollection"),
          item("Parse HTML & CSS", 50, "parseHTML"),
          item("Rendering", 20, "paintCompositeRender"),
        ],
      },
      {
        label: "Desktop",
        mainThreadWork: [
          item("Script Evaluation", 2770, "scriptEvaluation"),
          item("Script Parsing & Compilation", 548, "scriptParseCompile"),
        ],
      },
    ]);

    expect(result.rows.map((row) => row.category)).toEqual([
      "Parse HTML & CSS",
      "Script Parsing & Compilation",
      "Script Evaluation",
      "Style & Layout",
      "Rendering",
      "Garbage Collection",
      "Other",
    ]);
  });

  it("drops reports that have no breakdown items", () => {
    const result = buildMainThreadWorkTable([
      { label: "Mobile", mainThreadWork: [] },
      { label: "Desktop", mainThreadWork: [{ group: "scripting", duration: 12 }] },
    ]);

    expect(result.reportLabels).toEqual(["Desktop"]);
    expect(result.rows).toEqual([
      {
        category: "Scripting",
        valuesByReportLabel: { Desktop: 12 },
      },
    ]);
  });
});

describe("buildMainThreadWorkTableFromDetailRows", () => {
  it("pivots each report's category duration into its own column", () => {
    const result = buildMainThreadWorkTableFromDetailRows([
      {
        _userLabel: "Desktop",
        auditResult: {
          details: {
            items: [item("Parse HTML & CSS", 8, "parseHTML")],
          },
        },
      },
      {
        _userLabel: "Mobile",
        auditResult: {
          details: {
            items: [item("Parse HTML & CSS", 9, "parseHTML")],
          },
        },
      },
    ]);

    expect(result?.reportLabels).toEqual(["Mobile", "Desktop"]);
    expect(result?.rows).toEqual([
      {
        category: "Parse HTML & CSS",
        valuesByReportLabel: { Mobile: 9, Desktop: 8 },
      },
    ]);
  });
});
