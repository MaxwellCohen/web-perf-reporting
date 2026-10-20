import { describe, expect, it } from "vitest";
import type { WaterfallRow, WaterfallSegment } from "@/features/page-speed-insights/waterfall/waterfallData";
import {
  availableWaterfallSignals,
  filterWaterfallRowsBySignals,
  normalizeWaterfallSignals,
} from "@/features/page-speed-insights/waterfall/waterfallSignals";

function segment(overrides: Partial<WaterfallSegment> & Pick<WaterfallSegment, "id">): WaterfallSegment {
  return { start: 0, end: 10, ...overrides };
}

function row(overrides: Partial<WaterfallRow> & Pick<WaterfallRow, "id" | "kind">): WaterfallRow {
  return {
    label: overrides.id,
    resourceType: "Other",
    networkStart: 0,
    networkEnd: 10,
    duration: 10,
    ...overrides,
  };
}

describe("filterWaterfallRowsBySignals", () => {
  const rows: WaterfallRow[] = [
    row({
      id: "scripts",
      kind: "request-group",
      resourceType: "Script",
      label: "Script · 2 requests",
      segments: [
        segment({
          id: "app",
          label: "app.js",
          start: 10,
          end: 40,
          isCriticalChain: true,
          chain: { isLongest: true, endMs: 40 },
          transferSize: 100,
          priority: "High",
          scriptCpu: { totalMs: 20, scriptingMs: 10, parseMs: 5 },
        }),
        segment({
          id: "vendor",
          label: "vendor.js",
          start: 50,
          end: 80,
          queueStart: 30,
          queueEnd: 50,
          isLinkPreload: true,
          coverage: "40% used · 1.0 KiB unused",
          transferSize: 40,
        }),
      ],
    }),
    row({
      id: "tasks",
      kind: "task",
      resourceType: "Task",
      label: "Tasks (2)",
      segments: [
        segment({ id: "short", start: 90, end: 100, taskKind: "short" }),
        segment({ id: "long", start: 110, end: 200, taskKind: "long" }),
      ],
    }),
    row({
      id: "mark",
      kind: "user-mark",
      resourceType: "User timing",
      label: "app-ready",
      segments: [segment({ id: "mark-seg", start: 120, end: 120, label: "app-ready" })],
    }),
  ];

  it("leaves rows unchanged when no known signal is selected", () => {
    expect(filterWaterfallRowsBySignals(rows, [])).toBe(rows);
    expect(filterWaterfallRowsBySignals(rows, ["nope"])).toBe(rows);
    expect(normalizeWaterfallSignals(["longest", "chain", "nope"])).toEqual(["chain", "longest"]);
  });

  it("keeps critical-chain segments and drops the rest of a group", () => {
    const filtered = filterWaterfallRowsBySignals(rows, ["chain"]);
    expect(filtered.map((item) => item.id)).toEqual(["scripts"]);
    expect(filtered[0]?.segments?.map((item) => item.id)).toEqual(["app"]);
    expect(filtered[0]?.label).toBe("app.js");
    expect(filtered[0]?.isCriticalChain).toBe(true);
  });

  it("isolates the longest path, queued requests, and long tasks", () => {
    expect(filterWaterfallRowsBySignals(rows, ["longest"])[0]?.segments?.[0]?.id).toBe("app");

    const queued = filterWaterfallRowsBySignals(rows, ["queue"]);
    expect(queued[0]?.segments?.map((item) => item.id)).toEqual(["vendor"]);
    expect(queued[0]?.queueStart).toBe(30);

    const tasks = filterWaterfallRowsBySignals(rows, ["long-task"]);
    expect(tasks.map((item) => item.id)).toEqual(["tasks"]);
    expect(tasks[0]?.segments?.map((item) => item.id)).toEqual(["long"]);
    expect(tasks[0]?.label).toBe("Task");
  });

  it("combines signals with or semantics", () => {
    const filtered = filterWaterfallRowsBySignals(rows, ["short-task", "user-timing"]);
    expect(filtered.map((item) => item.id)).toEqual(["tasks", "mark"]);
    expect(filtered[0]?.segments?.map((item) => item.id)).toEqual(["short"]);
  });

  it("matches preload, unused code, high priority, and script CPU", () => {
    expect(filterWaterfallRowsBySignals(rows, ["preload"])[0]?.segments?.[0]?.id).toBe("vendor");
    expect(filterWaterfallRowsBySignals(rows, ["unused"])[0]?.segments?.[0]?.id).toBe("vendor");
    expect(filterWaterfallRowsBySignals(rows, ["high-priority"])[0]?.segments?.[0]?.id).toBe("app");
    expect(filterWaterfallRowsBySignals(rows, ["script-cpu"])[0]?.segments?.[0]?.id).toBe("app");
  });

  it("lists only signals present on the rows, in catalog order", () => {
    expect(availableWaterfallSignals(rows)).toEqual([
      "chain",
      "longest",
      "queue",
      "long-task",
      "short-task",
      "user-timing",
      "preload",
      "unused",
      "high-priority",
      "script-cpu",
    ]);
    expect(availableWaterfallSignals([rows[2]!])).toEqual(["user-timing"]);
  });
});
