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
  it("pairs EventTiming per frame and after the navigation", () => {
    const T0 = 1_000_000;
    const at = (ms: number) => T0 + ms * 1000;
    // Chrome wrote the frame in `args.frame` until 2022 and in `args.data.frame` since.
    const timing = (id: string, frame: string, type: string, interactionId: number, ms: number, legacy = false) => [
      {
        name: "EventTiming",
        ph: "b",
        id,
        pid: 1,
        tid: 2,
        ts: at(ms),
        args: {
          ...(legacy ? { frame } : {}),
          data: {
            ...(legacy ? {} : { frame }),
            type,
            interactionId,
            timeStamp: at(ms) / 1000,
            processingStart: at(ms + 10) / 1000,
            processingEnd: at(ms + 60) / 1000,
            duration: 200,
            nodeName: type === "pointerdown" ? "BUTTON" : "OTHER",
          },
        },
      },
      { name: "EventTiming", ph: "e", id, pid: 1, tid: 2, ts: at(ms + 200), args: legacy ? { frame } : { data: {} } },
    ];
    const t = parseTrace({
      traceEvents: [
        meta(1, 2, "CrRendererMain"),
        {
          name: "navigationStart",
          ph: "R",
          pid: 1,
          tid: 2,
          ts: at(0),
          args: { frame: "F1", data: { isOutermostMainFrame: true, documentLoaderURL: "https://x.test/" } },
        },
        // Before the navigation, and on another frame: both are ignored.
        ...timing("before", "F1", "click", 9, -50),
        ...timing("other-frame", "F2", "click", 2, 100),
        ...timing("other-frame-legacy", "F2", "click", 3, 100, true),
        ...timing("nav-frame", "F1", "pointerdown", 1, 100),
        ...timing("nav-frame-legacy", "F1", "keydown", 4, 400, true),
      ],
    });
    expect(t.interactions.map((i) => i.interactionId)).toEqual([1, 4]);
    expect(t.interactions[0]).toMatchObject({ type: "pointerdown", interactionId: 1, target: "BUTTON" });
  });

  it("uses ResourceFinish.finishTime for the network end, not the post-decode ts", () => {
    const T0 = 1_000_000;
    const t = parseTrace({
      traceEvents: [
        meta(1, 2, "CrRendererMain"),
        {
          name: "ResourceSendRequest",
          ph: "I",
          pid: 1,
          tid: 2,
          ts: T0 + 300_000,
          args: { data: { requestId: "r", url: "https://x.test/a.png", resourceType: "Image" } },
        },
        {
          name: "ResourceFinish",
          ph: "I",
          pid: 1,
          tid: 2,
          ts: T0 + 500_000,
          args: { data: { requestId: "r", finishTime: T0 / 1e6 + 0.35 } },
        },
      ],
    });
    // t0 is the first timed event (the send at 300 ms), so finishTime is 50 ms.
    expect(t.requests[0].end).toBeCloseTo(50);
  });

  it("falls back to the ResourceFinish ts when Chrome has no network finish time", () => {
    const T0 = 1_000_000;
    const finish = (requestId: string, data: object) => ({
      name: "ResourceFinish",
      ph: "I",
      pid: 1,
      tid: 2,
      ts: T0 + 200_000,
      args: { data: { requestId, ...data } },
    });
    const t = parseTrace({
      traceEvents: [
        meta(1, 2, "CrRendererMain"),
        ...["zero", "missing"].map((requestId) => ({
          name: "ResourceSendRequest",
          ph: "I",
          pid: 1,
          tid: 2,
          ts: T0,
          args: { data: { requestId, url: `https://x.test/${requestId}.js`, resourceType: "Script" } },
        })),
        // Chrome writes finishTime 0 (or leaves it out) for e.g. memory-cache hits.
        finish("zero", { finishTime: 0 }),
        finish("missing", {}),
      ],
    });
    expect(t.requests.map((r) => r.end)).toEqual([200, 200]);
  });

  it("times the first byte from receiveHeadersStart, like DevTools", () => {
    const T0 = 1_000_000;
    const response = (requestId: string, timing: object) => [
      {
        name: "ResourceSendRequest",
        ph: "I",
        pid: 1,
        tid: 2,
        ts: T0,
        args: { data: { requestId, url: `https://x.test/${requestId}`, resourceType: "Document" } },
      },
      {
        name: "ResourceReceiveResponse",
        ph: "I",
        pid: 1,
        tid: 2,
        ts: T0 + 130_000,
        args: { data: { requestId, statusCode: 200, timing: { requestTime: T0 / 1e6, ...timing } } },
      },
    ];
    const t = parseTrace({
      traceEvents: [
        meta(1, 2, "CrRendererMain"),
        ...response("modern", { receiveHeadersStart: 100, receiveHeadersEnd: 120 }),
        // Older Chrome has no start; -1 means "not recorded".
        ...response("older", { receiveHeadersEnd: 120 }),
        ...response("unknown", { receiveHeadersStart: -1, receiveHeadersEnd: 120 }),
      ],
    });
    expect(t.requests.map((r) => r.headersAt)).toEqual([100, 120, 120]);
  });

  it("maps LCP candidate nodes to the painted image URL", () => {
    const t = parseTrace({
      traceEvents: [
        meta(1, 2, "CrRendererMain"),
        {
          name: "largestContentfulPaint::Candidate",
          ph: "R",
          pid: 1,
          tid: 2,
          ts: 1000,
          args: { data: { nodeName: "IMG", nodeId: 5 } },
        },
        {
          name: "LargestImagePaint::Candidate",
          ph: "R",
          pid: 1,
          tid: 2,
          ts: 1000,
          args: { data: { DOMNodeId: 5, imageUrl: "https://cdn.test/a.png" } },
        },
      ],
    });
    expect(t.lcpCandidates[0].url).toBe("https://cdn.test/a.png");
  });

  it("rejects non-traces", () => {
    expect(() => parseTrace({})).toThrow(/missing traceEvents/);
  });
});
