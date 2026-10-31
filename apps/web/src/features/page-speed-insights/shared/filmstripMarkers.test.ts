import { describe, expect, it } from "vitest";
import { filmstripTimelineFromItem, labelsByFrameIndex } from "@/features/page-speed-insights/shared/filmstripMarkers";
import type { AuditResultsRecord } from "@/lib/schema";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

describe("labelsByFrameIndex", () => {
  const frames = [{ timing: 300 }, { timing: 1200 }, { timing: 2500 }, { timing: 4000 }];

  it("maps each marker to the first frame at or after its time", () => {
    expect(
      labelsByFrameIndex(frames, [
        { label: "FCP", timeMs: 1100 },
        { label: "LCP", timeMs: 2400 },
      ]),
    ).toEqual([[], ["FCP"], ["LCP"], []]);
  });

  it("stacks multiple markers on the same frame", () => {
    expect(
      labelsByFrameIndex(frames, [
        { label: "FCP", timeMs: 1000 },
        { label: "LCP", timeMs: 1150 },
      ]),
    ).toEqual([[], ["FCP", "LCP"], [], []]);
  });

  it("falls back to the last frame when a marker is past the filmstrip", () => {
    expect(labelsByFrameIndex(frames, [{ label: "TTI", timeMs: 9000 }])).toEqual([
      [],
      [],
      [],
      ["TTI"],
    ]);
  });

  it("returns empty label lists when there are no frames", () => {
    expect(labelsByFrameIndex([], [{ label: "FCP", timeMs: 100 }])).toEqual([]);
  });
});

function mobileFilmstripItem(): InsightsContextItem {
  return {
    label: "Mobile",
    item: {
      lighthouseResult: {
        configSettings: { formFactor: "mobile", throttlingMethod: "simulate" },
        audits: {
          metrics: {
            id: "metrics",
            details: {
              type: "debugdata",
              items: [
                {
                  timeToFirstByte: 601,
                  firstContentfulPaint: 2819,
                  largestContentfulPaint: 6980,
                  observedFirstContentfulPaint: 1200,
                  observedLargestContentfulPaint: 2500,
                  interactive: 9000,
                },
              ],
            },
          },
          "server-response-time": { id: "server-response-time", numericValue: 94 },
          "screenshot-thumbnails": {
            id: "screenshot-thumbnails",
            details: {
              type: "filmstrip",
              scale: 1,
              items: [
                { timing: 800, timestamp: 800, data: "img-early" },
                { timing: 1200, timestamp: 1200, data: "img-fcp" },
                { timing: 2500, timestamp: 2500, data: "img-lcp" },
              ],
            },
          },
          "network-requests": {
            id: "network-requests",
            details: {
              type: "table",
              headings: [],
              items: [
                {
                  url: "https://example.com/",
                  resourceType: "Document",
                  networkRequestTime: 0,
                  networkEndTime: 100,
                  rendererStartTime: 0,
                },
              ],
            },
          },
        },
      },
    } as unknown as InsightsContextItem["item"],
  };
}

describe("filmstripTimelineFromItem", () => {
  it("warps mobile filmstrip times onto the simulated lab clock", () => {
    const view = filmstripTimelineFromItem(mobileFilmstripItem());
    expect(view).not.toBeNull();
    expect(view!.simulationLabel).toMatch(/Slow 4G/);
    expect(view!.timeline.items.map((item) => item.timing)).not.toEqual([800, 1200, 2500]);
    expect(view!.timeline.items[0]!.timing).toBeGreaterThan(800);
    expect(view!.markers.find((marker) => marker.label === "FCP")?.timeMs).toBe(2819);
    expect(view!.markers.find((marker) => marker.label === "LCP")?.timeMs).toBe(6980);
  });

  it("keeps observed filmstrip times when throttling is already in the trace", () => {
    const item = mobileFilmstripItem();
    item.item = {
      ...item.item,
      lighthouseResult: {
        ...item.item.lighthouseResult!,
        configSettings: { formFactor: "mobile", throttlingMethod: "devtools" },
      },
    } as unknown as InsightsContextItem["item"];

    const view = filmstripTimelineFromItem(item);
    expect(view!.simulationLabel).toBeUndefined();
    expect(view!.timeline.items.map((frame) => frame.timing)).toEqual([800, 1200, 2500]);
  });
});
