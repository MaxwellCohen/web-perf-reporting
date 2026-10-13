import { describe, expect, it } from "vitest";
import type { AuditResultsRecord } from "@/lib/schema";
import { collectFcpScreenshots, frameAtFcp } from "@/features/page-speed-insights/fcpScreenshot";

const frames = [
  { data: "blank", timing: 200, timestamp: 200 },
  { data: "paint", timing: 1100, timestamp: 1100 },
  { data: "later", timing: 1800, timestamp: 1800 },
];

function auditsWithFilmstrip(
  fcpMs: number | undefined,
  items = frames,
): AuditResultsRecord {
  return {
    "first-contentful-paint": {
      id: "first-contentful-paint",
      title: "First Contentful Paint",
      score: 0.9,
      scoreDisplayMode: "numeric",
      numericValue: fcpMs,
    },
    "screenshot-thumbnails": {
      id: "screenshot-thumbnails",
      title: "Screenshot Thumbnails",
      score: 1,
      scoreDisplayMode: "informative",
      details: { type: "filmstrip", scale: 1, items },
    },
  };
}

describe("frameAtFcp", () => {
  it("uses the first frame after FCP", () => {
    expect(frameAtFcp(frames, 1200)?.data).toBe("later");
  });

  it("uses the frame captured exactly at FCP", () => {
    expect(frameAtFcp(frames, 1100)?.data).toBe("paint");
  });

  it("skips frames before FCP even when they are nearer", () => {
    expect(frameAtFcp(frames, 1300)?.data).toBe("later");
  });

  it("falls back to the last frame when FCP is past the filmstrip", () => {
    expect(frameAtFcp(frames, 2000)?.data).toBe("later");
  });

  it("returns the only frame when FCP lands inside it", () => {
    const filmstrip = [{ data: "blank", timing: 375, timestamp: 375 }];

    expect(frameAtFcp(filmstrip, 500)?.data).toBe("blank");
  });

  it("skips frames with no image data", () => {
    expect(
      frameAtFcp(
        [
          { data: "", timing: 1200, timestamp: 1200 },
          { data: "paint", timing: 1800, timestamp: 1800 },
        ],
        1200,
      )?.data,
    ).toBe("paint");
  });

  it("returns nothing when there are no usable frames", () => {
    expect(frameAtFcp([], 1200)).toBeUndefined();
    expect(frameAtFcp([{ data: "", timing: 1200 }], 1200)).toBeUndefined();
  });
});

describe("collectFcpScreenshots", () => {
  it("returns the first filmstrip frame after each report's FCP", () => {
    const screenshots = collectFcpScreenshots([
      { audits: auditsWithFilmstrip(1200), label: "Mobile" },
      { audits: auditsWithFilmstrip(1700), label: "Desktop" },
    ]);

    expect(screenshots).toEqual([
      { label: "Mobile", data: "later", timing: 1800, fcpMs: 1200 },
      { label: "Desktop", data: "later", timing: 1800, fcpMs: 1700 },
    ]);
  });

  it("returns nothing when FCP or the filmstrip is missing", () => {
    const noFcp: AuditResultsRecord = {
      "screenshot-thumbnails": auditsWithFilmstrip(1200)["screenshot-thumbnails"],
    };
    const noFilmstrip: AuditResultsRecord = {
      "first-contentful-paint": auditsWithFilmstrip(1200)["first-contentful-paint"],
    };

    expect(
      collectFcpScreenshots([
        { audits: noFcp, label: "Mobile" },
        { audits: noFilmstrip, label: "Desktop" },
      ]),
    ).toEqual([]);
  });
});
