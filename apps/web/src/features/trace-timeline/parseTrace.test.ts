import { describe, expect, it } from "vitest";
import { parseTrace } from "./parseTrace";

const meta = (pid: number, tid: number, name: string) => ({ name: "thread_name", ph: "M", pid, tid, ts: 0, args: { name } });

describe("parseTrace", () => {
  it("nests slices, picks markers and flags long tasks", () => {
    const t = parseTrace({
      traceEvents: [
        meta(1, 2, "CrRendererMain"),
        { name: "RunTask", ph: "X", pid: 1, tid: 2, ts: 1000, dur: 80000 },
        { name: "FunctionCall", ph: "X", pid: 1, tid: 2, ts: 1000, dur: 40000 },
        { name: "Layout", ph: "X", pid: 1, tid: 2, ts: 5000, dur: 1000 },
        { name: "firstContentfulPaint", ph: "R", pid: 1, tid: 2, ts: 50000 },
      ],
    });
    const s = t.tracks[0].slices;
    expect(s.map((x) => x.depth)).toEqual([0, 1]);
    expect(t.markers[0]).toMatchObject({ label: "FCP", time: 49 });
    expect(t.longTasks).toHaveLength(1);
  });
  it("rejects non-traces", () => {
    expect(() => parseTrace({})).toThrow();
  });
});
