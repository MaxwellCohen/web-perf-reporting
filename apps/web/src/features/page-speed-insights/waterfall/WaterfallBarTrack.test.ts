import { describe, expect, it } from "vitest";
import type { WaterfallRow } from "@/features/page-speed-insights/waterfall/waterfallData";
import { segmentTooltipLines } from "@/features/page-speed-insights/waterfall/WaterfallBarTrack";

describe("segmentTooltipLines", () => {
  it("describes a blocking request bar", () => {
    const row: WaterfallRow = {
      id: "r1",
      kind: "request",
      label: "https://example.com/app.css",
      url: "https://example.com/app.css",
      resourceType: "Stylesheet",
      renderBlocking: "blocking",
      networkStart: 100,
      networkEnd: 200,
      duration: 100,
    };

    expect(
      segmentTooltipLines(row, {
        id: "s1",
        start: 100,
        end: 200,
        label: "example.com/app.css",
        queueStart: 80,
        queueEnd: 100,
        renderBlocking: "blocking",
      }),
    ).toEqual([
      "example.com/app.css",
      "Stylesheet · 100 ms–200 ms · 100 ms",
      "Queued 20 ms · Blocking",
    ]);
  });

  it("describes a long task bar", () => {
    const row: WaterfallRow = {
      id: "tasks-0",
      kind: "task",
      label: "Tasks (1)",
      resourceType: "Task",
      renderBlocking: "blocking",
      networkStart: 50,
      networkEnd: 120,
      duration: 70,
    };

    expect(
      segmentTooltipLines(row, {
        id: "t0",
        start: 50,
        end: 120,
        label: "app.js",
        taskKind: "long",
        renderBlocking: "blocking",
      }),
    ).toEqual(["app.js", "Long task · 50 ms–120 ms · 70 ms", "Blocking"]);
  });

  it("includes priority and coverage when present", () => {
    const row: WaterfallRow = {
      id: "r1",
      kind: "request",
      label: "https://example.com/app.js",
      resourceType: "Script",
      networkStart: 0,
      networkEnd: 10,
      duration: 10,
      priority: "High",
      coverage: "50% used",
    };
    expect(
      segmentTooltipLines(row, {
        id: "s",
        start: 0,
        end: 10,
        label: "app.js",
        priority: "High",
        coverage: "50% used",
      }),
    ).toEqual(
      expect.arrayContaining(["High priority", "Coverage 50% used"]),
    );
  });

  it("formats VeryHigh priority with a space", () => {
    const row: WaterfallRow = {
      id: "r1",
      kind: "request",
      label: "https://example.com/",
      resourceType: "Document",
      networkStart: 0,
      networkEnd: 10,
      duration: 10,
      priority: "VeryHigh",
    };
    expect(
      segmentTooltipLines(row, {
        id: "s",
        start: 0,
        end: 10,
        label: "Document",
        priority: "VeryHigh",
      }),
    ).toEqual(expect.arrayContaining(["Very High priority"]));
  });

  it("includes bootup cpu and critical-chain timing", () => {
    const row: WaterfallRow = {
      id: "tasks-0",
      kind: "task",
      label: "Task",
      resourceType: "Task",
      networkStart: 800,
      networkEnd: 980,
      duration: 180,
      isCriticalChain: true,
      scriptCpu: { totalMs: 1177.7, scriptingMs: 258, parseMs: 892 },
      chain: { endMs: 595, extendsMs: 345, isLongest: true },
    };

    expect(
      segmentTooltipLines(row, {
        id: "t0",
        start: 800,
        end: 980,
        label: "cdn.example.com/tag.js",
        taskKind: "long",
        isCriticalChain: true,
        scriptCpu: row.scriptCpu,
        chain: row.chain,
      }),
    ).toEqual([
      "cdn.example.com/tag.js",
      "Long task · 800 ms–980 ms · 180 ms",
      "Total CPU Time 1.18 s · Script Parse 892 ms · Script Evaluation 258 ms · Other 28 ms",
      "Critical path · 345 ms past its parent",
    ]);
  });
});
