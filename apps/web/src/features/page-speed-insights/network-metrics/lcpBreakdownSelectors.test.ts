import { describe, expect, it } from "vitest";
import { buildLcpBreakdownTableFromDetailRows } from "@/features/page-speed-insights/network-metrics/lcpBreakdownSelectors";

describe("buildLcpBreakdownTableFromDetailRows", () => {
  it("combines each report into columns on the same subpart rows", () => {
    const result = buildLcpBreakdownTableFromDetailRows([
      {
        _userLabel: "Desktop",
        auditResult: {
          details: {
            items: [
              { subpart: "elementRenderDelay", label: "Element render delay", duration: 400 },
              { subpart: "timeToFirstByte", label: "Time to first byte", duration: 20 },
            ],
          },
        },
      },
      {
        _userLabel: "Mobile",
        auditResult: {
          details: {
            items: [
              { subpart: "timeToFirstByte", label: "Time to first byte", duration: 13 },
              { subpart: "elementRenderDelay", label: "Element render delay", duration: 3390 },
            ],
          },
        },
      },
    ]);

    expect(result?.reportLabels).toEqual(["Mobile", "Desktop"]);
    expect(result?.tableRows.map((row) => row.subpart)).toEqual([
      "timeToFirstByte",
      "elementRenderDelay",
    ]);
    expect(result?.tableRows[0]?.valuesByReportLabel).toEqual({
      Mobile: 13,
      Desktop: 20,
    });
    expect(result?.tableRows[1]?.valuesByReportLabel).toEqual({
      Mobile: 3390,
      Desktop: 400,
    });
  });

  it("returns null when no subparts are present", () => {
    expect(
      buildLcpBreakdownTableFromDetailRows([
        { _userLabel: "Mobile", auditResult: { details: { items: [] } } },
      ]),
    ).toBeNull();
  });
});
