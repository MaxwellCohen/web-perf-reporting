import { describe, expect, it } from "vitest";
import { buildAlignedCompareRows } from "./buildAlignedCompareRows";
import type { TimelineEvent } from "./types";

function event(id: string, timeMs: number, title = id): TimelineEvent {
  return {
    id,
    phaseId: "afterLoad",
    phaseTitle: "After load",
    timeMs,
    title,
    detail: "",
    status: "measured",
    hasTimestamp: true,
    kind: "marker",
    evidence: [],
  };
}

describe("buildAlignedCompareRows", () => {
  it("puts the same step from both runs on one row despite different times", () => {
    const rows = buildAlignedCompareRows(
      [event("navigation", 0, "Nav A"), event("conn-preconnect", 130, "Preconnect A")],
      [event("navigation", 0, "Nav B"), event("conn-preconnect", 20, "Preconnect B")],
    );

    expect(rows).toHaveLength(2);
    expect(rows[1]?.left.map((e) => e.title)).toEqual(["Preconnect A"]);
    expect(rows[1]?.right.map((e) => e.title)).toEqual(["Preconnect B"]);
    expect(rows[1]?.leftTimeMs).toBe(130);
    expect(rows[1]?.rightTimeMs).toBe(20);
    expect(rows[1]?.timeMs).toBe(20);
  });

  it("matches indexed events by their base id", () => {
    const rows = buildAlignedCompareRows([event("net-0", 300)], [event("net-4", 900)]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.left.map((e) => e.id)).toEqual(["net-0"]);
    expect(rows[0]?.right.map((e) => e.id)).toEqual(["net-4"]);
  });

  it("gives unmatched events their own row in time order", () => {
    const rows = buildAlignedCompareRows(
      [event("navigation", 0), event("lcp", 2000)],
      [event("navigation", 0), event("preload", 500), event("lcp", 1500)],
    );

    expect(rows.map((row) => [row.left.map((e) => e.id), row.right.map((e) => e.id)])).toEqual([
      [["navigation"], ["navigation"]],
      [[], ["preload"]],
      [["lcp"], ["lcp"]],
    ]);
  });

  it("keeps each side in its own time order", () => {
    const rows = buildAlignedCompareRows(
      [event("b", 100), event("a", 200)],
      [event("a", 100), event("b", 200)],
    );
    const leftIds = rows.flatMap((row) => row.left.map((e) => e.id));
    const rightIds = rows.flatMap((row) => row.right.map((e) => e.id));
    expect(leftIds).toEqual(["b", "a"]);
    expect(rightIds).toEqual(["a", "b"]);
  });
});
