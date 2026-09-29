import { describe, expect, it } from "vitest";
import {
  buildMainThreadWorkTable,
  buildMainThreadWorkTableFromDetailRows,
} from "@/features/page-speed-insights/javascript-metrics/mainThreadWorkTable";
import type { TableItem } from "@/lib/schema";

function item(groupLabel: string, duration: number, group = groupLabel): TableItem {
  return { group, groupLabel, duration };
}

describe("buildMainThreadWorkTable", () => {
  it("puts each report duration in its own column on one category row", () => {
    const result = buildMainThreadWorkTable([
      {
        label: "Desktop",
        mainThreadWork: [item("Parse HTML & CSS", 8), item("Rendering", 11)],
      },
      {
        label: "Mobile",
        mainThreadWork: [item("Parse HTML & CSS", 9), item("Rendering", 8)],
      },
    ]);

    expect(result.reportLabels).toEqual(["Mobile", "Desktop"]);
    expect(result.rows).toEqual([
      {
        category: "Rendering",
        valuesByReportLabel: { Mobile: 8, Desktop: 11 },
      },
      {
        category: "Parse HTML & CSS",
        valuesByReportLabel: { Mobile: 9, Desktop: 8 },
      },
    ]);
  });

  it("keeps a single report in encounter order", () => {
    const result = buildMainThreadWorkTable([
      {
        label: "Mobile",
        mainThreadWork: [item("Script Evaluation", 40), item("Rendering", 8)],
      },
    ]);

    expect(result.reportLabels).toEqual(["Mobile"]);
    expect(result.rows.map((row) => row.category)).toEqual(["Script Evaluation", "Rendering"]);
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
            items: [item("Parse HTML & CSS", 8)],
          },
        },
      },
      {
        _userLabel: "Mobile",
        auditResult: {
          details: {
            items: [item("Parse HTML & CSS", 9)],
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
