import { describe, expect, it } from "vitest";
import { buildGroupedComparison } from "@/features/page-speed-insights/shared/comparisonChartData";

describe("buildGroupedComparison", () => {
  it("keeps each report as its own series and ranks the largest category at the top", () => {
    const { series, rows } = buildGroupedComparison([
      { label: "Mobile", category: "Script", value: 100 },
      { label: "Mobile", category: "Script", value: 50 },
      { label: "Desktop", category: "Script", value: 40 },
      { label: "Mobile", category: "Image", value: 10 },
      { label: "Desktop", category: "Image", value: 80 },
    ]);

    expect(series).toEqual([
      { key: "r0", label: "Mobile" },
      { key: "r1", label: "Desktop" },
    ]);
    expect(rows).toEqual([
      { category: "Script", r0: 150, r1: 40 },
      { category: "Image", r0: 10, r1: 80 },
    ]);
  });

  it("uses the max value when origins repeat inside one report", () => {
    const { rows } = buildGroupedComparison(
      [
        { label: "Mobile", category: "cdn.example", value: 20 },
        { label: "Mobile", category: "cdn.example", value: 80 },
        { label: "Desktop", category: "cdn.example", value: 30 },
      ],
      { aggregate: "max" },
    );

    expect(rows).toEqual([{ category: "cdn.example", r0: 80, r1: 30 }]);
  });

  it("limits to the largest categories and keeps a report that has no rows", () => {
    const { series, rows } = buildGroupedComparison(
      [
        { label: "Mobile", category: "a.js", value: 10 },
        { label: "Mobile", category: "b.js", value: 40 },
        { label: "Mobile", category: "c.js", value: 5 },
      ],
      { labels: ["Mobile", "Desktop"], limit: 2 },
    );

    expect(series.map((entry) => entry.label)).toEqual(["Mobile", "Desktop"]);
    expect(rows).toEqual([
      { category: "b.js", r0: 40, r1: 0 },
      { category: "a.js", r0: 10, r1: 0 },
    ]);
  });

  it("keeps listed category order with the first category at the top", () => {
    const { rows } = buildGroupedComparison(
      [
        { label: "Mobile", category: ">10ms", value: 4 },
        { label: "Mobile", category: ">25ms", value: 1 },
        { label: "Desktop", category: ">10ms", value: 2 },
        { label: "Desktop", category: ">25ms", value: 0 },
      ],
      { order: "listed-top-first" },
    );

    expect(rows.map((row) => row.category)).toEqual([">10ms", ">25ms"]);
    expect(rows[0]).toMatchObject({ r0: 4, r1: 2 });
  });
});
