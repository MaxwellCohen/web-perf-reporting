// oxlint-disable vitest/no-conditional-expect
import { describe, expect, it } from "vitest";
import {
  clusterOverlappingMoments,
  isIntervalMoment,
  momentInterval,
} from "./clusterOverlappingMoments";
import type { TimelineEvent } from "./types";

function moment(
  partial: Partial<TimelineEvent> & Pick<TimelineEvent, "id" | "timeMs">,
): TimelineEvent {
  return {
    phaseId: "subresources",
    phaseTitle: "Subresources finish",
    title: partial.id,
    detail: "",
    status: "measured",
    hasTimestamp: true,
    kind: "marker",
    evidence: [],
    ...partial,
  };
}

describe("momentInterval / isIntervalMoment", () => {
  it("treats point markers as zero-length ranges", () => {
    const fcp = moment({ id: "fcp", timeMs: 1200 });
    expect(momentInterval(fcp)).toEqual({ startMs: 1200, endMs: 1200 });
    expect(isIntervalMoment(fcp)).toBe(false);
  });

  it("uses startMs/endMs for intervals", () => {
    const download = moment({ id: "net-0", startMs: 80, timeMs: 400, endMs: 400 });
    expect(momentInterval(download)).toEqual({ startMs: 80, endMs: 400 });
    expect(isIntervalMoment(download)).toBe(true);
  });
});

describe("clusterOverlappingMoments", () => {
  it("returns singles when nothing overlaps", () => {
    const a = moment({ id: "a", startMs: 0, timeMs: 100, endMs: 100 });
    const b = moment({ id: "b", startMs: 200, timeMs: 300, endMs: 300 });
    expect(clusterOverlappingMoments([a, b])).toEqual([
      { kind: "single", event: a },
      { kind: "single", event: b },
    ]);
  });

  it("clusters two overlapping intervals", () => {
    const doc = moment({ id: "doc", startMs: 5, timeMs: 220, endMs: 220 });
    const css = moment({ id: "css", startMs: 80, timeMs: 400, endMs: 400 });
    const clusters = clusterOverlappingMoments([doc, css]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({
      kind: "parallel",
      startMs: 5,
      endMs: 400,
    });
    if (clusters[0]?.kind === "parallel") {
      expect(clusters[0].events.map((e) => e.id)).toEqual(["doc", "css"]);
    }
  });

  it("forms a transitive cluster when A overlaps B and B overlaps C", () => {
    const a = moment({ id: "a", startMs: 0, timeMs: 100, endMs: 100 });
    const b = moment({ id: "b", startMs: 90, timeMs: 200, endMs: 200 });
    const c = moment({ id: "c", startMs: 190, timeMs: 300, endMs: 300 });
    const clusters = clusterOverlappingMoments([a, b, c]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({ kind: "parallel", startMs: 0, endMs: 300 });
    if (clusters[0]?.kind === "parallel") {
      expect(clusters[0].events.map((e) => e.id)).toEqual(["a", "b", "c"]);
    }
  });

  it("never joins point events into a cluster", () => {
    const download = moment({ id: "net", startMs: 0, timeMs: 1000, endMs: 1000 });
    const fcp = moment({ id: "fcp", timeMs: 150 });
    const task = moment({ id: "task", startMs: 200, timeMs: 400, endMs: 400 });
    // Encounter order by timeMs: fcp (150), task (400), download (1000)
    const clusters = clusterOverlappingMoments([fcp, task, download]);
    expect(clusters.map((item) => item.kind)).toEqual(["single", "parallel"]);
    expect(clusters[0]).toEqual({ kind: "single", event: fcp });
    if (clusters[1]?.kind === "parallel") {
      expect(clusters[1].events.map((e) => e.id)).toEqual(["net", "task"]);
      expect(clusters[1].startMs).toBe(0);
      expect(clusters[1].endMs).toBe(1000);
    }
  });

  it("clusters a short interval nested inside a long download", () => {
    const long = moment({ id: "long", startMs: 0, timeMs: 1000, endMs: 1000 });
    const short = moment({ id: "short", startMs: 100, timeMs: 200, endMs: 200 });
    const clusters = clusterOverlappingMoments([short, long]);
    expect(clusters).toHaveLength(1);
    if (clusters[0]?.kind === "parallel") {
      expect(clusters[0].events.map((e) => e.id)).toEqual(["long", "short"]);
      expect(clusters[0].startMs).toBe(0);
      expect(clusters[0].endMs).toBe(1000);
    }
  });

  it("sorts parallel members by start time", () => {
    const lateStart = moment({ id: "late", startMs: 300, timeMs: 500, endMs: 500 });
    const earlyStart = moment({ id: "early", startMs: 100, timeMs: 600, endMs: 600 });
    const clusters = clusterOverlappingMoments([lateStart, earlyStart]);
    expect(clusters).toHaveLength(1);
    if (clusters[0]?.kind === "parallel") {
      expect(clusters[0].events.map((e) => e.id)).toEqual(["early", "late"]);
    }
  });
});
