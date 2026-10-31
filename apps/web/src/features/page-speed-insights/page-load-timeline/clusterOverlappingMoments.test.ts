// oxlint-disable vitest/no-conditional-expect
import { describe, expect, it } from "vitest";
import { isIntervalMoment, momentInterval } from "./clusterOverlappingMoments";
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
