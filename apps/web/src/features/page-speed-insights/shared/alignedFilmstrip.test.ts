import { describe, expect, it } from "vitest";

import {
  buildAlignedFilmstrip,
  pickStepMs,
} from "@/features/page-speed-insights/shared/alignedFilmstrip";

describe("pickStepMs", () => {
  it("picks the smallest step within the column budget", () => {
    expect(pickStepMs(1500, 16)).toBe(100);
    expect(pickStepMs(6260, 16)).toBe(500);
    expect(pickStepMs(40000, 16)).toBe(2000);
  });
});

describe("buildAlignedFilmstrip", () => {
  it("aligns runs with different frame cadences on one axis", () => {
    const result = buildAlignedFilmstrip(
      [
        {
          frames: [
            { timing: 300, data: "a1" },
            { timing: 900, data: "a2" },
          ],
          markers: [{ label: "FCP", timeMs: 300 }],
        },
        {
          frames: [
            { timing: 500, data: "b1" },
            { timing: 1000, data: "b2" },
          ],
          markers: [{ label: "LCP", timeMs: 950 }],
        },
      ],
      4,
    );

    expect(result.stepMs).toBe(250);
    expect(result.times).toEqual([250, 500, 750, 1000]);
    expect(result.rows[0].map((cell) => cell.frame?.data ?? null)).toEqual([
      null,
      "a1",
      "a1",
      "a2",
    ]);
    expect(result.rows[0].map((cell) => cell.changed)).toEqual([false, true, false, true]);
    expect(result.rows[0][1].labels).toEqual(["FCP"]);
    expect(result.rows[1].map((cell) => cell.frame?.data ?? null)).toEqual([
      null,
      "b1",
      "b1",
      "b2",
    ]);
    expect(result.rows[1][3].labels).toEqual(["LCP"]);
  });

  it("returns no columns when there is nothing to show", () => {
    expect(buildAlignedFilmstrip([{ frames: [], markers: [] }]).times).toEqual([]);
  });
});
