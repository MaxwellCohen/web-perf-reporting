import { describe, expect, it } from "vitest";
import { alignTimeBucketMs, buildAlignedCompareRows } from "./buildAlignedCompareRows";
import type { TimelineEvent } from "./types";

function event(id: string, timeMs: number, title = id): TimelineEvent {
  return {
    id,
    phaseId: "load",
    phaseTitle: "Load",
    timeMs,
    title,
    detail: "",
    status: "measured",
    hasTimestamp: true,
    kind: "marker",
    evidence: [],
  };
}

describe("alignTimeBucketMs", () => {
  it("snaps sub-second times to whole ms", () => {
    expect(alignTimeBucketMs(500.4)).toBe(500);
  });

  it("snaps 1.xx s times to 10ms so formatMs labels match", () => {
    expect(alignTimeBucketMs(1316)).toBe(1320);
    expect(alignTimeBucketMs(1324)).toBe(1320);
  });
});

describe("buildAlignedCompareRows", () => {
  it("puts equal timestamps on the same row", () => {
    const rows = buildAlignedCompareRows(
      [event("nav", 0, "Nav A"), event("fcp", 1200, "FCP A")],
      [event("nav", 0, "Nav B"), event("fcp", 1000, "FCP B")],
    );

    expect(rows.map((row) => row.timeMs)).toEqual([0, 1000, 1200]);
    expect(rows[0]?.left.map((e) => e.title)).toEqual(["Nav A"]);
    expect(rows[0]?.right.map((e) => e.title)).toEqual(["Nav B"]);
    expect(rows[1]?.left).toEqual([]);
    expect(rows[1]?.right.map((e) => e.title)).toEqual(["FCP B"]);
    expect(rows[2]?.left.map((e) => e.title)).toEqual(["FCP A"]);
    expect(rows[2]?.right).toEqual([]);
  });

  it("merges near-equal times that display as the same label", () => {
    const rows = buildAlignedCompareRows(
      [event("font-a", 1316, "Font A")],
      [event("font-b", 1324, "Font B")],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.timeMs).toBe(1320);
    expect(rows[0]?.left.map((e) => e.title)).toEqual(["Font A"]);
    expect(rows[0]?.right.map((e) => e.title)).toEqual(["Font B"]);
  });

  it("stacks multiple events that share a timestamp in one cell", () => {
    const rows = buildAlignedCompareRows(
      [event("a", 500), event("b", 500)],
      [event("c", 500)],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.left.map((e) => e.id)).toEqual(["a", "b"]);
    expect(rows[0]?.right.map((e) => e.id)).toEqual(["c"]);
  });
});