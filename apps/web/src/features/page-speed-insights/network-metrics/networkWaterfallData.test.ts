import { describe, expect, it } from "vitest";
import type { CombinedLoad } from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";
import {
  buildTimeAxisTicks,
  buildWaterfallRows,
  buildWaterfallRowsFromSources,
  countRequestRows,
  filterWaterfallRows,
  getSegmentStyle,
  getWaterfallResourceTypes,
  getWaterfallTimeRange,
  normalizeNetworkRequest,
  sortWaterfallRows,
} from "@/features/page-speed-insights/network-metrics/networkWaterfallData";

function makeLoad(overrides: Partial<CombinedLoad> = {}): CombinedLoad {
  return {
    label: "Desktop",
    ttfbObserved: false,
    requests: [],
    redirectHops: [],
    redirectAuditUrls: [],
    longTasks: [],
    userTimings: [],
    screenshots: [],
    lcpSegments: [],
    lcpDiscoveryFailures: [],
    layoutShifts: [],
    preconnectCandidates: [],
    ...overrides,
  };
}

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

    expect(row.kind).toBe("request");
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

  it("filters to blocking requests and tasks only", () => {
    const rows = buildWaterfallRowsFromSources(
      makeLoad({
        requests: [
          {
            url: "https://example.com/app.css",
            resourceType: "Stylesheet",
            networkRequestTime: 10,
            networkEndTime: 40,
            renderBlocking: "blocking",
            isCriticalChain: false,
          },
          {
            url: "https://example.com/hero.png",
            resourceType: "Image",
            networkRequestTime: 20,
            networkEndTime: 50,
            renderBlocking: "non-blocking",
            isCriticalChain: false,
          },
        ],
        longTasks: [{ startTime: 60, duration: 80 }],
        userTimings: [{ name: "app-ready", timingType: "Mark", startTime: 90 }],
      }),
      { density: "expanded" },
    );

    const filtered = filterWaterfallRows(rows, { blockingOnly: true });
    expect(filtered.map((row) => row.kind).sort()).toEqual(["request", "task"]);
    expect(filtered.every((row) => row.kind !== "user-mark")).toBe(true);
  });

  it("keeps tasks and user timings when filtering resource types", () => {
    const rows = buildWaterfallRowsFromSources(
      makeLoad({
        requests: [
          {
            url: "https://example.com/app.js",
            resourceType: "Script",
            networkRequestTime: 10,
            networkEndTime: 40,
            renderBlocking: "blocking",
            isCriticalChain: false,
          },
          {
            url: "https://example.com/hero.png",
            resourceType: "Image",
            networkRequestTime: 20,
            networkEndTime: 50,
            renderBlocking: "non-blocking",
            isCriticalChain: false,
          },
        ],
        longTasks: [{ startTime: 60, duration: 80 }],
        userTimings: [{ name: "app-ready", timingType: "Mark", startTime: 90 }],
      }),
      { density: "expanded" },
    );

    const filtered = filterWaterfallRows(rows, { resourceTypes: ["Script"] });
    expect(filtered.map((row) => row.kind).sort()).toEqual(["request", "task", "user-mark"]);
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

  it("builds nice round axis ticks for larger ranges", () => {
    expect(buildTimeAxisTicks(0, 2685, 5)).toEqual([0, 500, 1000, 1500, 2000, 2500, 3000]);
  });

  it("builds expanded rows with blocking, marks, measures, and long tasks", () => {
    const rows = buildWaterfallRowsFromSources(
      makeLoad({
        requests: [
          {
            url: "https://example.com/app.css",
            resourceType: "Stylesheet",
            networkRequestTime: 10,
            networkEndTime: 40,
            rendererStartTime: 5,
            renderBlocking: "blocking",
            isCriticalChain: false,
            transferSize: 1000,
          },
        ],
        longTasks: [{ startTime: 50, duration: 80, url: "https://example.com/app.js" }],
        userTimings: [
          { name: "nav", timingType: "Mark", startTime: 0 },
          { name: "work", timingType: "Measure", startTime: 20, duration: 15 },
        ],
      }),
      { density: "expanded" },
    );

    expect(rows.map((row) => row.kind)).toEqual([
      "user-mark",
      "request",
      "user-measure",
      "task",
    ]);
    expect(rows.find((row) => row.kind === "request")?.renderBlocking).toBe("blocking");
    expect(rows.find((row) => row.kind === "user-mark")?.label).toBe("nav");
    expect(rows.find((row) => row.kind === "user-measure")?.duration).toBe(15);
    const loneTask = rows.find((row) => row.kind === "task");
    expect(loneTask?.label).toBe("Task");
    expect(loneTask?.renderBlocking).toBe("blocking");
  });

  it("copies bootup cpu and chain timing onto request and task bars", () => {
    const scriptCpu = { totalMs: 420, scriptingMs: 300, parseMs: 80 };
    const chain = { endMs: 900, extendsMs: 400, isLongest: true };
    const rows = buildWaterfallRowsFromSources(
      makeLoad({
        requests: [
          {
            url: "https://example.com/app.js",
            resourceType: "Script",
            networkRequestTime: 10,
            networkEndTime: 40,
            renderBlocking: "non-blocking",
            isCriticalChain: true,
            scriptCpu,
            chain,
          },
        ],
        longTasks: [
          {
            startTime: 50,
            duration: 80,
            url: "https://example.com/app.js",
            scriptCpu,
            chain,
          },
        ],
      }),
      { density: "expanded" },
    );

    const request = rows.find((row) => row.kind === "request");
    expect(request?.segments?.[0]).toMatchObject({ scriptCpu, chain });
    const task = rows.find((row) => row.kind === "task");
    expect(task?.segments?.[0]).toMatchObject({ scriptCpu, chain });
  });

  it("keeps tasks on one row when the gap is under 50ms, else splits", () => {
    const rows = buildWaterfallRowsFromSources(
      makeLoad({
        requests: [
          {
            url: "https://example.com/",
            resourceType: "Document",
            networkRequestTime: 0,
            networkEndTime: 10,
            renderBlocking: "non-blocking",
            isCriticalChain: false,
          },
        ],
        longTasks: [
          { startTime: 100, duration: 20 }, // ends 120
          { startTime: 105, duration: 15 }, // gap overlap → same row
          { startTime: 160, duration: 60 }, // gap 25ms from 135 → same row (<50)
          { startTime: 300, duration: 20 }, // gap 80ms from 220 → new row
        ],
      }),
      { density: "expanded" },
    );

    const tasks = rows.filter((row) => row.kind === "task");
    expect(tasks).toHaveLength(2);
    expect(tasks[0]?.label).toBe("Tasks (3)");
    expect(tasks[0]?.segments?.map((seg) => seg.taskKind)).toEqual([
      "short",
      "short",
      "long",
    ]);
    expect(tasks[0]?.networkStart).toBe(100);
    expect(tasks[0]?.networkEnd).toBe(220);
    expect(tasks[0]?.renderBlocking).toBe("blocking");
    expect(tasks[1]?.label).toBe("Task");
    expect(tasks[1]?.networkStart).toBe(300);
    expect(tasks[1]?.renderBlocking).toBe("potentially-blocking");
  });

  it("collapses same-type requests onto shared rows with segments", () => {
    const rows = buildWaterfallRowsFromSources(
      makeLoad({
        requests: [
          {
            url: "https://example.com/a.js",
            resourceType: "Script",
            networkRequestTime: 10,
            networkEndTime: 30,
            renderBlocking: "non-blocking",
            isCriticalChain: false,
          },
          {
            url: "https://example.com/b.js",
            resourceType: "Script",
            networkRequestTime: 20,
            networkEndTime: 40,
            renderBlocking: "blocking",
            isCriticalChain: false,
          },
          {
            url: "https://example.com/style.css",
            resourceType: "Stylesheet",
            networkRequestTime: 15,
            networkEndTime: 35,
            renderBlocking: "potentially-blocking",
            isCriticalChain: false,
          },
        ],
      }),
      { density: "collapsed" },
    );

    // Stylesheet starts between the two scripts, so scripts split into two groups.
    const requestRows = rows.filter(
      (row) => row.kind === "request" || row.kind === "request-group",
    );
    expect(requestRows).toHaveLength(3);
    expect(countRequestRows(rows)).toBe(3);

    const contiguous = buildWaterfallRowsFromSources(
      makeLoad({
        requests: [
          {
            url: "https://example.com/a.js",
            resourceType: "Script",
            networkRequestTime: 10,
            networkEndTime: 30,
            renderBlocking: "non-blocking",
            isCriticalChain: false,
          },
          {
            url: "https://example.com/b.js",
            resourceType: "Script",
            networkRequestTime: 20,
            networkEndTime: 40,
            renderBlocking: "blocking",
            isCriticalChain: false,
          },
        ],
      }),
      { density: "collapsed" },
    );

    expect(contiguous).toHaveLength(1);
    expect(contiguous[0]?.kind).toBe("request-group");
    expect(contiguous[0]?.segments).toHaveLength(2);
    expect(contiguous[0]?.renderBlocking).toBe("blocking");
    expect(contiguous[0]?.label).toContain("2 requests");
  });
});
