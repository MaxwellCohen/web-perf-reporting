import { describe, expect, it } from "vitest";
import { pinFrameChangeTimes } from "./pinFrameTimes";

const frames = [
  { timing: 375, data: "blank" },
  { timing: 750, data: "blank" },
  { timing: 1875, data: "page" },
  { timing: 2250, data: "page" },
  { timing: 2625, data: "page+" },
];

describe("pinFrameChangeTimes", () => {
  it("pins the first and last changed frames to the visual-change times", () => {
    const pinned = pinFrameChangeTimes(frames, { first: 1662, last: 2265 });
    expect(pinned.map((f) => f.timing)).toEqual([375, 750, 1662, 2250, 2265]);
  });

  it("uses the middle of the window when no milestone falls in it", () => {
    const pinned = pinFrameChangeTimes(frames, {});
    expect(pinned[2]!.timing).toBe((750 + 1875) / 2);
  });

  it("leaves unchanged frames and the first frame alone", () => {
    const pinned = pinFrameChangeTimes(frames, { first: 1662 });
    expect(pinned[0]!.timing).toBe(375);
    expect(pinned[1]!.timing).toBe(750);
    expect(pinned[3]!.timing).toBe(2250);
  });

  it("keeps frame order", () => {
    const pinned = pinFrameChangeTimes(frames, { first: 1662, last: 2265 });
    for (let i = 1; i < pinned.length; i++) {
      expect(pinned[i]!.timing).toBeGreaterThanOrEqual(pinned[i - 1]!.timing);
    }
  });
});
