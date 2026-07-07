import { describe, expect, it } from "vitest";
import {
  buildTimeAxisTicks,
  buildWaterfallRows,
  filterWaterfallRows,
  getSegmentStyle,
  getWaterfallResourceTypes,
  getWaterfallTimeRange,
  normalizeNetworkRequest,
  sortWaterfallRows,
} from "@/features/page-speed-insights/network-metrics/networkWaterfallData";

describe("networkWaterfallData", () => {
  it("normalizes a row with queue and network segments", () => {
    const row = normalizeNetworkRequest(
      {
        url: "https://example.com/app.js",
        resourceType: "Script",
        networkRequestTime: 100,
        networkEndTime: 250,
        rendererStartTime: 80,
        transferSize: 12000,
        statusCode: 200,
      },
      0,
    );

    expect(row.queueStart).toBe(80);
    expect(row.queueEnd).toBe(100);
    expect(row.networkStart).toBe(100);
    expect(row.networkEnd).toBe(250);
    expect(row.duration).toBe(170);
  });

  it("omits queue segment when rendererStartTime is missing or not before network start", () => {
    expect(
      normalizeNetworkRequest(
        { url: "https://example.com/", networkRequestTime: 50, networkEndTime: 120 },
        0,
      ).queueStart,
    ).toBeUndefined();

    expect(
      normalizeNetworkRequest(
        {
          url: "https://example.com/",
          networkRequestTime: 50,
          networkEndTime: 120,
          rendererStartTime: 50,
        },
        0,
      ).queueStart,
    ).toBeUndefined();
  });

  it("builds rows and calculates time range", () => {
    const rows = buildWaterfallRows([
      { networkRequestTime: 10, networkEndTime: 100, url: "https://a.test/" },
      { networkRequestTime: 50, networkEndTime: 200, url: "https://b.test/" },
    ]);

    expect(rows).toHaveLength(2);
    expect(getWaterfallTimeRange(rows)).toEqual({ minStart: 10, maxEnd: 200 });
  });

  it("filters by resource type and search", () => {
    const rows = buildWaterfallRows([
      {
        url: "https://example.com/app.js",
        resourceType: "Script",
        networkRequestTime: 1,
        networkEndTime: 10,
      },
      {
        url: "https://example.com/style.css",
        resourceType: "Stylesheet",
        networkRequestTime: 2,
        networkEndTime: 20,
      },
    ]);

    expect(
      filterWaterfallRows(rows, { resourceTypes: ["Script"] }).map((row) => row.resourceType),
    ).toEqual(["Script"]);

    expect(filterWaterfallRows(rows, { search: "style.css" })).toHaveLength(1);
  });

  it("sorts by start, duration, and size", () => {
    const rows = buildWaterfallRows([
      {
        url: "https://a.test/",
        networkRequestTime: 100,
        networkEndTime: 150,
        transferSize: 100,
      },
      {
        url: "https://b.test/",
        networkRequestTime: 10,
        networkEndTime: 200,
        transferSize: 500,
      },
    ]);

    expect(sortWaterfallRows(rows, "start").map((row) => row.url)).toEqual([
      "https://b.test/",
      "https://a.test/",
    ]);
    expect(sortWaterfallRows(rows, "duration")[0]?.url).toBe("https://b.test/");
    expect(sortWaterfallRows(rows, "size")[0]?.url).toBe("https://b.test/");
  });

  it("returns unique resource types", () => {
    const rows = buildWaterfallRows([
      { url: "https://a.test/", resourceType: "Script", networkRequestTime: 1, networkEndTime: 2 },
      { url: "https://b.test/", resourceType: "Image", networkRequestTime: 1, networkEndTime: 2 },
      { url: "https://c.test/", resourceType: "Script", networkRequestTime: 1, networkEndTime: 2 },
    ]);

    expect(getWaterfallResourceTypes(rows)).toEqual(["Image", "Script"]);
  });

  it("computes segment styles against the time range", () => {
    expect(getSegmentStyle(100, 200, 0, 400)).toEqual({ left: "25%", width: "25%" });
  });

  it("builds evenly spaced axis ticks", () => {
    expect(buildTimeAxisTicks(0, 400, 5)).toEqual([0, 100, 200, 300, 400]);
  });
});
