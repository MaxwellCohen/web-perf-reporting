import { describe, expect, it } from "vitest";

import { analyzeLoad } from "./analyzeLoad";
import { buildEventPrompt } from "./eventPrompt";
import { parseTrace } from "./parseTrace";

const ev = (name: string, ts: number, dur: number, args: object = {}) => ({
  name,
  ph: "X",
  ts,
  dur,
  pid: 1,
  tid: 1,
  cat: "devtools.timeline",
  args,
});

const events = [
  { name: "thread_name", ph: "M", pid: 1, tid: 1, ts: 0, args: { name: "CrRendererMain" } },
  {
    name: "navigationStart",
    ph: "R",
    pid: 1,
    tid: 1,
    ts: 0,
    cat: "blink.user_timing",
    args: { frame: "F", data: { documentLoaderURL: "https://example.com/" } },
  },
  ev("RunTask", 10_000, 300_000),
  ev("FunctionCall", 10_000, 280_000, {
    data: { functionName: "renderAll", url: "https://example.com/app.js", lineNumber: 41 },
  }),
  ev("UpdateLayoutTree", 20_000, 120_000),
];

describe("buildEventPrompt", () => {
  it("explains what ran inside a long task", () => {
    const trace = parseTrace(events);
    const a = analyzeLoad(trace);
    const task = a.events.find((e) => e.kind === "task")!;
    expect(task.window).toBeDefined();
    const text = buildEventPrompt(trace, a, task);
    expect(text).toContain("Long task");
    expect(text).toContain("Heaviest call path");
    expect(text).toContain("renderAll()");
    expect(text).toContain("forced synchronous layout");
    expect(text).toContain("## Do this");
  });

  it("handles point events by looking at the lead-up window", () => {
    const trace = parseTrace(events);
    const a = analyzeLoad(trace);
    const nav = {
      time: 500,
      kind: "lcp" as const,
      title: "Largest contentful paint · 500 ms",
      detail: "IMG hero",
      tone: "bad" as const,
    };
    expect(buildEventPrompt(trace, a, nav)).toContain("Largest contentful paint");
  });
});
