import { describe, expect, it } from "vitest";
import type { AuditResult } from "@/lib/schema";
import {
  formatTaskMs,
  longTaskItemsFromAudit,
  summarizeLongTaskScripts,
  summarizeMainThreadTasks,
  taskItemsFromAudit,
} from "@/features/page-speed-insights/mainThreadTaskSummary";

describe("summarizeMainThreadTasks", () => {
  it("counts blocking time only for tasks longer than 50 ms", () => {
    const summary = summarizeMainThreadTasks([
      { startTime: 100, duration: 40 },
      { startTime: 200, duration: 50 },
      { startTime: 300, duration: 80 },
      { startTime: 10, duration: 120 },
    ]);

    expect(summary.totalTasks).toBe(4);
    expect(summary.totalTimeMs).toBe(290);
    expect(summary.longestDurationMs).toBe(120);
    expect(summary.longTaskCount).toBe(2);
    expect(summary.blockingTimeMs).toBe(100);
    expect(summary.longestTasks.map((task) => task.duration)).toEqual([120, 80]);
    expect(summary.omittedLongTaskCount).toBe(0);
  });

  it("limits the listed long tasks and still includes omitted ones in blocking time", () => {
    const items = [60, 70, 80].map((duration, index) => ({
      startTime: index * 100,
      duration,
    }));

    const summary = summarizeMainThreadTasks(items, 1);

    expect(summary.longTaskCount).toBe(3);
    expect(summary.longestTasks).toHaveLength(1);
    expect(summary.longestTasks[0].duration).toBe(80);
    expect(summary.omittedLongTaskCount).toBe(2);
    expect(summary.blockingTimeMs).toBe(60);
  });

  it("ignores items without a numeric duration", () => {
    const summary = summarizeMainThreadTasks([{ startTime: 1 }, { duration: "90" }, { duration: 90 }]);

    expect(summary.totalTasks).toBe(1);
    expect(summary.blockingTimeMs).toBe(40);
  });
});

describe("summarizeLongTaskScripts", () => {
  it("groups tasks by script and sums blocking time past 50 ms", () => {
    const rows = summarizeLongTaskScripts([
      { url: "https://cdn.example/app.js", duration: 120 },
      { url: "https://cdn.example/app.js", duration: 80 },
      { url: "https://cdn.example/vendor.js", duration: 200 },
      { url: "Unattributable", duration: 60 },
      { url: "https://cdn.example/short.js", duration: 40 },
    ]);

    expect(rows).toEqual([
      { url: "https://cdn.example/vendor.js", taskCount: 1, blockingTimeMs: 150 },
      { url: "https://cdn.example/app.js", taskCount: 2, blockingTimeMs: 100 },
      { url: "Unattributable", taskCount: 1, blockingTimeMs: 10 },
      { url: "https://cdn.example/short.js", taskCount: 1, blockingTimeMs: 0 },
    ]);
  });
});

describe("longTaskItemsFromAudit", () => {
  it("reads script URLs from table items", () => {
    const audit = {
      id: "long-tasks",
      title: "Avoid long main-thread tasks",
      details: {
        type: "table",
        headings: [],
        items: [{ url: "https://cdn.example/app.js", duration: 90, startTime: 10 }],
      },
    } as AuditResult;

    expect(longTaskItemsFromAudit(audit)).toEqual([
      { url: "https://cdn.example/app.js", duration: 90, startTime: 10 },
    ]);
  });

  it("falls back to debugData url indexes when items have no URL", () => {
    const audit = {
      id: "long-tasks",
      title: "Avoid long main-thread tasks",
      details: {
        type: "table",
        headings: [],
        items: [{ duration: 90, startTime: 10 }],
        debugData: {
          type: "debugdata",
          urls: ["https://cdn.example/app.js"],
          tasks: [{ urlIndex: 0, duration: 90 }],
        },
      },
    } as AuditResult;

    expect(longTaskItemsFromAudit(audit)).toEqual([
      { url: "https://cdn.example/app.js", duration: 90 },
    ]);
  });
});

describe("formatTaskMs", () => {
  it("rounds milliseconds and switches to seconds at 1000", () => {
    expect(formatTaskMs(49.6)).toBe("50 ms");
    expect(formatTaskMs(1500)).toBe("1.50 s");
  });
});

describe("taskItemsFromAudit", () => {
  it("reads table items and returns an empty list otherwise", () => {
    const withItems = {
      id: "main-thread-tasks",
      title: "Tasks",
      details: { type: "table", headings: [], items: [{ duration: 10 }] },
    } as AuditResult;

    expect(taskItemsFromAudit(withItems)).toEqual([{ duration: 10 }]);
    expect(
      taskItemsFromAudit({ id: "main-thread-tasks", title: "Tasks" } as AuditResult),
    ).toEqual([]);
  });
});
