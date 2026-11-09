import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  analyzeTraceBody,
  analyzeTraceFile,
  buildReport,
  isGzipBuffer,
  loadTraceFile,
  parseTimeRange,
  parseTimeValue,
  parseTraceJson,
  resolveTimeRange,
  scanTraces,
  traceBounds,
} from "../src/trace.js";
import { formatTraceReport } from "../src/traceFormat.js";
import { miniTrace, nav, T } from "./traceFixture.js";

let dir = "";

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "web-perf-trace-test-"));
  const body = JSON.stringify(miniTrace());
  await writeFile(join(dir, "mini.json"), body);
  await writeFile(join(dir, "mini.json.gz"), gzipSync(Buffer.from(body)));
  await writeFile(
    join(dir, "other.json"),
    JSON.stringify({ traceEvents: [{ name: "navigationStart", ph: "R", pid: 1, tid: 2, ts: 1_000_000, args: {} }] }),
  );
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("trace loading", () => {
  it("accepts event arrays and traceEvents wrappers", () => {
    expect(parseTraceJson("[1]")).toEqual([1]);
    expect(parseTraceJson('{"traceEvents":[1]}')).toEqual([1]);
    expect(() => parseTraceJson('{"other":[]}')).toThrow(/traceEvents/);
    expect(() => parseTraceJson("nope")).toThrow(/Failed to parse/);
  });

  it("loads plain and gzipped files", async () => {
    const plain = await loadTraceFile(join(dir, "mini.json"));
    const gzipped = await loadTraceFile(join(dir, "mini.json.gz"));
    expect(plain.parsedTrace.data.Meta.mainFrameURL).toBe("https://x.test/");
    expect(gzipped.parsedTrace.data.Meta.mainFrameURL).toBe("https://x.test/");
    expect(isGzipBuffer(gzipSync(Buffer.from("x")))).toBe(true);
    expect(isGzipBuffer(Buffer.from("x"))).toBe(false);
  });

  it("explains a missing file and a directory", async () => {
    await expect(loadTraceFile(join(dir, "missing.json"))).rejects.toThrow(/not found/);
    await expect(loadTraceFile(dir)).rejects.toThrow(/is a directory/);
  });

  it("falls back to timed events and ignores ts:0 metadata", () => {
    const bounds = traceBounds({ data: {} } as never, [
      { name: "thread_name", ph: "M", ts: 0 },
      { name: "a", ph: "X", ts: 1_000_000, dur: 2000 },
      { name: "b", ph: "X", ts: 1_500_000, dur: 1000 },
    ]);
    expect(bounds).toEqual({ min: 1_000_000, max: 1_501_000 });
  });
});

describe("time ranges", () => {
  it("parses units and separators", () => {
    expect(parseTimeValue("3.5s")).toBe(3500);
    expect(parseTimeValue("50ms")).toBe(50);
    expect(parseTimeValue("5000us")).toBe(5);
    expect(parseTimeRange("100,500")).toEqual({ startMs: 100, endMs: 500 });
    expect(parseTimeRange("3.5s..4.2s")).toEqual({ startMs: 3500, endMs: 4200 });
    expect(parseTimeRange("100ms-500ms")).toEqual({ startMs: 100, endMs: 500 });
    expect(parseTimeRange(undefined)).toBeUndefined();
  });

  it("rejects malformed ranges", () => {
    expect(() => parseTimeRange("100")).toThrow(/Invalid time range/);
    expect(() => parseTimeRange("500,100")).toThrow(/must be <=/);
  });

  it("resolves relative and absolute windows", () => {
    const bounds = { min: T, max: T + 5_000_000 };
    expect(resolveTimeRange({ startMs: 1000, endMs: 2000 }, bounds)).toEqual({
      startMs: T / 1000 + 1000,
      endMs: T / 1000 + 2000,
    });
    expect(resolveTimeRange({ startMs: T / 1000, endMs: T / 1000 + 1000 }, bounds, true)).toEqual({
      startMs: T / 1000,
      endMs: T / 1000 + 1000,
    });
    expect(() => resolveTimeRange({ startMs: 10_000, endMs: 20_000 }, bounds)).toThrow(/outside trace duration/);
  });
});

describe("trace reports", () => {
  it("reports Core Web Vitals and main-thread time", async () => {
    const report = await analyzeTraceFile(join(dir, "mini.json"));
    expect(report.command).toBe("overview");
    if (report.command !== "overview") return;
    expect(report.url).toBe("https://x.test/");
    expect(report.coreWebVitals.fcp).toMatchObject({ valueMs: 900, rating: "good" });
    expect(report.coreWebVitals.lcp).toMatchObject({ valueMs: 2500, rating: "good", element: "IMG" });
    expect(report.coreWebVitals.cls).toMatchObject({ value: 0.05, rating: "good" });
    expect(report.coreWebVitals.inp).toMatchObject({ valueMs: 200, rating: "good", interactionType: "pointerdown" });
    expect(report.mainThreadBreakdown.totalMs).toBe(1300);
    expect(report.mainThreadBreakdown.scriptingMs).toBeGreaterThan(0);
  });

  it("extracts interaction subparts and navigations", async () => {
    const interactions = await analyzeTraceBody(miniTrace(), { command: "interactions" });
    if (interactions.command !== "interactions") throw new Error("wrong report");
    expect(interactions.interactions[0]).toMatchObject({
      eventType: "pointerdown",
      targetElement: "BUTTON",
      // Trace-relative: the trace starts 100 ms before the navigation.
      startTimeMs: 2100,
      durationMs: 200,
      inputDelayMs: 10,
      processingDurationMs: 50,
      presentationDelayMs: 140,
    });

    const navigations = await analyzeTraceBody(miniTrace(), { command: "navigations" });
    if (navigations.command !== "navigations") throw new Error("wrong report");
    expect(navigations.navigations[0]).toMatchObject({
      navigationId: nav,
      url: "https://x.test/",
      timestampMs: 100,
      isMainFrame: true,
      hasInsights: true,
    });
  });

  it("extracts insight cards", async () => {
    const report = await analyzeTraceBody(miniTrace(), { command: "insights" });
    if (report.command !== "insights") throw new Error("wrong report");
    expect(report.lcpBreakdown).toMatchObject({
      totalLcpMs: 2500,
      element: "IMG",
    });
    expect(report.inpBreakdown).toMatchObject({
      eventType: "pointerdown",
      totalDurationMs: 200,
      inputDelayMs: 10,
      processingDurationMs: 50,
      presentationDelayMs: 140,
    });
    expect(report.clsCulprits?.[0]).toMatchObject({ timestampMs: 1300, score: 0.05 });
    expect(report.thirdParties?.find((t) => t.entityName === "cdn.test")?.mainThreadTimeMs).toBe(50);
  });

  it("never reports an LCP timestamp as the LCP duration", () => {
    const report = buildReport(
      {
        rawEvents: [],
        parsedTrace: {
          data: { Meta: { traceBounds: { min: 0, max: 1_000_000 } } },
          insights: new Map([
            [
              "NAVIGATION_0",
              {
                model: {
                  LCPBreakdown: {
                    // Only a trace timestamp is available; it must not leak into totalLcpMs.
                    lcpTs: 1_002_500_000,
                    subparts: {
                      ttfb: { range: 100_000 },
                      loadDelay: { range: 200_000 },
                      loadDuration: { range: 300_000 },
                      renderDelay: { range: 400_000 },
                    },
                  },
                },
              },
            ],
          ]),
        },
      },
      { command: "insights" },
    );
    if (report.command !== "insights") throw new Error("wrong report");
    expect(report.lcpBreakdown).toMatchObject({
      totalLcpMs: 1000,
      ttfbMs: 100,
      loadDelayMs: 200,
      loadDurationMs: 300,
      renderDelayMs: 400,
    });
  });

  it("rejects an unknown navigation or insight set", async () => {
    await expect(
      analyzeTraceBody(miniTrace(), { command: "insights", navigationId: "nope" }),
    ).rejects.toThrow(/Unknown navigation or insight set "nope"/);
  });

  it("clamps Chrome's -1 transfer-size sentinel in JSON", () => {
    const report = buildReport(
      {
        rawEvents: [],
        parsedTrace: {
          data: { Meta: { traceBounds: { min: 0, max: 1_000_000 } } },
          insights: new Map([
            [
              "NAVIGATION_0",
              {
                model: {
                  RenderBlocking: {
                    renderBlockingRequests: [{ dur: 1000, args: { data: { url: "https://x.test/a.css", encodedDataLength: -1 } } }],
                  },
                  ThirdParties: { entitySummaries: [{ entity: { name: "cdn.test" }, transferSize: -1 }] },
                },
              },
            ],
          ]),
        },
      },
      { command: "insights" },
    );
    if (report.command !== "insights") throw new Error("wrong report");
    expect(report.renderBlocking?.[0].transferSizeBytes).toBe(0);
    expect(report.thirdParties?.[0].transferSizeBytes).toBe(0);
  });

  it("lists slowest network requests", async () => {
    const report = await analyzeTraceBody(miniTrace(), { command: "network" });
    if (report.command !== "network") throw new Error("wrong report");
    expect(report.requests[0]).toMatchObject({
      url: "https://x.test/",
      mimeType: "text/html",
      totalDurationMs: 110,
      transferSizeBytes: 5000,
      renderBlocking: false,
    });
  });

  it("rejects time ranges for per-navigation commands", async () => {
    await expect(
      analyzeTraceBody(miniTrace(), { command: "insights", timeRange: "0,1s" }),
    ).rejects.toThrow(/does not support a time range/);
    await expect(
      analyzeTraceBody(miniTrace(), { command: "navigations", timeRange: "0,1s" }),
    ).rejects.toThrow(/does not support a time range/);
  });

  it("filters events by name, fields and time range", async () => {
    const report = await analyzeTraceBody(miniTrace(), {
      command: "events",
      names: ["LayoutShift"],
      fields: ["args.data.weighted_score_delta"],
      timeRange: "0,1.5s",
      limit: 5,
    });
    if (report.command !== "events") throw new Error("wrong report");
    expect(report.totalMatched).toBe(1);
    expect(report.events[0].tsMs).toBe(1300);
    expect(report.events[0].selectedFields?.["args.data.weighted_score_delta"]).toBe(0.05);

    const outside = await analyzeTraceBody(miniTrace(), {
      command: "events",
      names: ["LayoutShift"],
      timeRange: "1s,1.2s",
    });
    if (outside.command !== "events") throw new Error("wrong report");
    expect(outside.totalMatched).toBe(0);
  });

  it("lists tasks and finds function calls", async () => {
    const tasks = await analyzeTraceBody(miniTrace(), { command: "tasks", minDurationMs: 50 });
    if (tasks.command !== "tasks") throw new Error("wrong report");
    expect(tasks.tasks[0]).toMatchObject({ functionName: "RunTask > work", durationMs: 100, selfTimeMs: 50 });

    const found = await analyzeTraceBody(miniTrace(), { command: "find", functionName: "work" });
    if (found.command !== "find") throw new Error("wrong report");
    expect(found.totalCalls).toBe(1);
    expect(found.calls[0]).toMatchObject({ durationMs: 50, url: "https://cdn.test/a.js", lineNumber: 3 });
  });

  it("extracts layout-shift clusters", async () => {
    const report = await analyzeTraceBody(miniTrace(), { command: "shifts", includeEvents: true });
    if (report.command !== "shifts") throw new Error("wrong report");
    expect(report.clusters[0]).toMatchObject({ cumulativeScore: 0.05 });
    expect(report.clusters[0].culprits[0]).toMatchObject({ nodeId: 5, tagName: "IMG" });
    expect(report.clusters[0].events).toHaveLength(1);
  });

  it("formats markdown, json and toon", async () => {
    const report = await analyzeTraceBody(miniTrace(), { command: "overview" });
    expect(formatTraceReport(report, "md")).toContain("# Trace Overview");
    expect(JSON.parse(formatTraceReport(report, "json")).command).toBe("overview");
    expect(formatTraceReport(report, "toon")).toContain("command: overview");
  });

  it("widens code spans and fences around untrusted backticks", () => {
    const md = formatTraceReport(
      {
        command: "events",
        totalMatched: 1,
        returned: 1,
        events: [
          {
            name: "a`b",
            tsMs: 1,
            cat: "x|y",
            ph: "X",
            pid: 1,
            tid: 2,
            selectedFields: { "args.data.url": "https://x.test/```payload" },
          },
        ],
      },
      "md",
    );
    expect(md).toContain("``a`b``");
    expect(md).toContain("x\\|y");
    expect(md).toContain("````json");

    // Longer runs widen further, and plain cells cannot smuggle a code delimiter
    // or a bare carriage return through the table.
    const tricky = formatTraceReport(
      {
        command: "events",
        totalMatched: 1,
        returned: 1,
        events: [{ name: "a``b", tsMs: 1, cat: "x`y\rz", ph: "X`|y\rz", pid: 1, tid: 2 }],
      },
      "md",
    );
    expect(tricky).toContain("```a``b```");
    expect(tricky).toContain("x'y z");
    expect(tricky).toContain("X'\\|y z");
    expect(tricky).not.toContain("\r");

    const warnings = formatTraceReport(
      { command: "insights", warnings: ["trace text\n# injected heading"] },
      "md",
    );
    expect(warnings).toContain("- trace text # injected heading");
    expect(warnings).not.toContain("\n# injected heading");
  });
});

describe("trace scan", () => {
  it("matches files by event name and grep", () => {
    const byName = scanTraces([join(dir, "*.json")], { names: ["EventTiming"] });
    expect(byName.totalFilesMatched).toBe(1);
    expect(byName.matchedFiles[0].file).toContain("mini.json");
    expect(byName.matchedFiles[0].matchCount).toBe(2);

    const byGrep = scanTraces([dir], { grep: "largestContentfulPaint" });
    expect(byGrep.matchedFiles.map((f) => f.file).join()).toContain("mini.json");

    const gzipped = scanTraces([join(dir, "*.json.gz")], { names: ["EventTiming"] });
    expect(gzipped.totalFilesMatched).toBe(1);
    expect(gzipped.matchedFiles[0].file).toContain("mini.json.gz");
    expect(gzipped.matchedFiles[0].firstEventTsMs).toBe(2100);
  });

  it("requires a filter", () => {
    expect(() => scanTraces([dir], {})).toThrow(/at least one filter|Provide at least one/i);
  });

  it("reports corrupt files instead of silently skipping them", async () => {
    const bad = await mkdtemp(join(tmpdir(), "web-perf-trace-bad-"));
    try {
      await writeFile(join(bad, "broken.json"), "{not json");
      await writeFile(join(bad, "broken.json.gz"), gzipSync(Buffer.from("{not json")));
      await writeFile(join(bad, "truncated.json.gz"), Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00]));
      const report = scanTraces([bad], { grep: "EventTiming" });
      expect(report.totalFilesSkipped).toBe(3);
      const skipped = report.skippedFiles.map((f) => f.file).join();
      expect(skipped).toContain("broken.json");
      expect(skipped).toContain("broken.json.gz");
      expect(skipped).toContain("truncated.json.gz");
      expect(report.skippedFiles.some((f) => /decompress|parse|JSON/i.test(f.reason))).toBe(true);
    } finally {
      await rm(bad, { recursive: true, force: true });
    }
  });

  it("ignores explicit non-trace files instead of reporting them as corrupt", async () => {
    const mixed = await mkdtemp(join(tmpdir(), "web-perf-trace-mixed-"));
    try {
      await writeFile(join(mixed, "README.md"), "# not a trace");
      await writeFile(join(mixed, "mini.json"), JSON.stringify(miniTrace()));
      const report = scanTraces([join(mixed, "README.md"), join(mixed, "mini.json")], {
        names: ["EventTiming"],
      });
      expect(report.totalFilesScanned).toBe(1);
      expect(report.totalFilesSkipped).toBe(0);
      expect(report.totalFilesMatched).toBe(1);
    } finally {
      await rm(mixed, { recursive: true, force: true });
    }
  });
});
