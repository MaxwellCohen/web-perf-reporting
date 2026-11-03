import { describe, expect, it } from "vitest";
import { analyzeLoad, hotFunctions } from "./analyzeLoad";
import { buildFixPrompt } from "./fixPrompt";
import { parseTrace } from "./parseTrace";

const M = (pid: number, tid: number, name: string) => ({ name: "thread_name", ph: "M", pid, tid, ts: 0, args: { name } });
const frame = "F1";

function build() {
  return parseTrace({
    traceEvents: [
      M(1, 2, "CrRendererMain"),
      { name: "navigationStart", ph: "R", pid: 1, tid: 2, ts: 1_000_000, args: { frame, data: { isOutermostMainFrame: true, documentLoaderURL: "https://x.test/" } } },
      { name: "firstContentfulPaint", ph: "R", pid: 1, tid: 2, ts: 1_900_000, args: { frame } },
      { name: "largestContentfulPaint::Candidate", ph: "R", pid: 1, tid: 2, ts: 2_500_000, args: { frame, data: { nodeName: "IMG", type: "image", size: 10 } } },
      // Other frame must be ignored.
      { name: "loadEventEnd", ph: "R", pid: 1, tid: 2, ts: 1_100_000, args: { frame: "OTHER" } },
      { name: "RunTask", ph: "X", pid: 1, tid: 2, ts: 1_300_000, dur: 120_000 },
      { name: "FunctionCall", ph: "X", pid: 1, tid: 2, ts: 1_300_000, dur: 120_000, args: { data: { url: "https://x.test/app.js" } } },
      { name: "Profile", ph: "P", pid: 1, tid: 2, ts: 1_000_000, args: { data: { startTime: 1_000_000 } } },
      { name: "ProfileChunk", ph: "P", pid: 1, tid: 2, ts: 1_500_000, args: { data: { cpuProfile: { nodes: [{ id: 1, callFrame: { functionName: "(root)" } }, { id: 2, parent: 1, callFrame: { functionName: "heavy", url: "https://x.test/app.js", lineNumber: 9 } }], samples: [2, 2, 2] }, timeDeltas: [300_000, 10_000, 10_000] } } },
    ],
  });
}

describe("analyzeLoad", () => {
  it("scopes to the main navigation and reports times relative to it", () => {
    const a = analyzeLoad(build());
    expect(a.fcp).toBeCloseTo(900);
    expect(a.lcp).toBeCloseTo(1500);
    expect(a.events.map((e) => e.kind)).toContain("navigation");
    expect(a.events.some((e) => e.title === "Load event")).toBe(false);
  });
  it("attributes long tasks to hot functions from the CPU profile", () => {
    const t = build();
    const a = analyzeLoad(t);
    expect(a.events.find((e) => e.kind === "task")?.detail).toContain("heavy");
    expect(hotFunctions(t.profile, 0, 1e9)[0].fn).toBe("heavy");
  });
  it("builds a fix prompt with the measured numbers and problems", () => {
    const p = buildFixPrompt(analyzeLoad(build()));
    expect(p).toContain("https://x.test/");
    expect(p).toContain("FCP 900 ms");
    expect(p).toContain("Long task");
    expect(p).toContain("Re-record a trace");
  });
});
