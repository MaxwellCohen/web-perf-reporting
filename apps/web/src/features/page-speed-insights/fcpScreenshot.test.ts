import { describe, expect, it } from "vitest";
import type { AuditResultsRecord } from "@/lib/schema";
import {
  collectFcpScreenshots,
  frameAtFcp,
  frameClosestToTime,
} from "@/features/page-speed-insights/fcpScreenshot";

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

describe("frameClosestToTime", () => {
  it("picks the frame nearest the given time", () => {
    expect(frameClosestToTime(frames, 1200)?.data).toBe("paint");
  });

  it("prefers the earlier frame when two are equally close", () => {
    const tied = [
      { data: "before", timing: 1000, timestamp: 1000 },
      { data: "after", timing: 1400, timestamp: 1400 },
    ];
    expect(frameClosestToTime(tied, 1200)?.data).toBe("before");
  });

  it("skips frames with no image data", () => {
    expect(
      frameClosestToTime(
        [
          { data: "", timing: 1200, timestamp: 1200 },
          { data: "paint", timing: 1800, timestamp: 1800 },
        ],
        1200,
      )?.data,
    ).toBe("paint");
  });
});

describe("frameAtFcp", () => {
  it("uses the nearest frame when it already shows a change", () => {
    expect(frameAtFcp(frames, 1200)?.data).toBe("paint");
  });

  it("skips repeated blank frames and uses the first frame that changes", () => {
    const filmstrip = [
      { data: "blank", timing: 375, timestamp: 375 },
      { data: "blank", timing: 750, timestamp: 750 },
      { data: "content", timing: 1125, timestamp: 1125 },
    ];

    expect(frameAtFcp(filmstrip, 692)?.data).toBe("content");
  });

  it("keeps the nearest frame when the next change is much later", () => {
    const filmstrip = [
      { data: "blank", timing: 375, timestamp: 375 },
      { data: "blank", timing: 750, timestamp: 750 },
      { data: "content", timing: 3000, timestamp: 3000 },
    ];

    expect(frameAtFcp(filmstrip, 692)?.data).toBe("blank");
  });
});

describe("collectFcpScreenshots", () => {
  it("returns the filmstrip frame nearest each report's FCP", () => {
    const screenshots = collectFcpScreenshots([
      { audits: auditsWithFilmstrip(1200), label: "Mobile" },
      { audits: auditsWithFilmstrip(1900), label: "Desktop" },
    ]);

    expect(screenshots).toEqual([
      { label: "Mobile", data: "paint", timing: 1100, fcpMs: 1200 },
      { label: "Desktop", data: "later", timing: 1800, fcpMs: 1900 },
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
