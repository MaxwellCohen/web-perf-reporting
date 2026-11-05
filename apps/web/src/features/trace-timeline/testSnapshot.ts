import { analyzeLoad } from "./analyzeLoad";
import { buildSnapshot, type TraceSnapshot } from "./findings";
import { parseTrace } from "./parseTrace";

const M = (name: string) => ({
  name: "thread_name",
  ph: "M",
  pid: 1,
  tid: 2,
  ts: 0,
  args: { name },
});
const X = (name: string, ts: number, dur: number, args?: object) => ({
  name,
  ph: "X",
  pid: 1,
  tid: 2,
  ts: ts * 1000,
  dur: dur * 1000,
  args,
});

/** Heavy fixture: 600ms task with forced layout inside script, GC, big script, shift, slow LCP. */
export function heavyTrace(scriptUrl = "https://x.test/app.js", taskMs = 600) {
  const frame = "F1";
  const R = (name: string, ts: number, args: object = {}) => ({
    name,
    ph: "R",
    pid: 1,
    tid: 2,
    ts: ts * 1000,
    args: { frame, ...args },
  });
  return parseTrace({
    traceEvents: [
      M("CrRendererMain"),
      R("navigationStart", 1000, {
        data: { isOutermostMainFrame: true, documentLoaderURL: "https://x.test/" },
      }),
      R("firstContentfulPaint", 1500),
      R("largestContentfulPaint::Candidate", 4500, {
        data: { nodeName: "IMG", type: "image", size: 10 },
      }),
      R("LayoutShift", 2000, {
        data: { score: 0.3, had_recent_input: false, is_main_frame: true },
      }),
      X("RunTask", 1600, taskMs),
      X("EvaluateScript", 1600, taskMs, { data: { url: scriptUrl } }),
      X("Layout", 1700, 400),
      X("MajorGC", 2400, 150),
    ],
  });
}

export function heavySnapshot(scriptUrl?: string, taskMs?: number): TraceSnapshot {
  const t = heavyTrace(scriptUrl, taskMs);
  return buildSnapshot(t, analyzeLoad(t));
}
