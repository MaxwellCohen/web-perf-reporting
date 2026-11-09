import { describe, expect, it } from "vitest";
import { analyzeLoad } from "./analyzeLoad";
import { buildClsClusters, buildInp, buildInsights, buildLcpBreakdown } from "./insights";
import { parseTrace } from "./parseTrace";

const T0 = 1_000_000; // µs
const frame = "F1";
const at = (ms: number) => T0 + ms * 1000;

const meta = { name: "thread_name", ph: "M", pid: 1, tid: 2, ts: 0, args: { name: "CrRendererMain" } };
const R = (name: string, ms: number, data?: object) => ({
  name,
  ph: "R",
  pid: 1,
  tid: 2,
  ts: at(ms),
  args: { frame, data },
});
const X = (name: string, ms: number, durMs: number, data?: object) => ({
  name,
  ph: "X",
  pid: 1,
  tid: 2,
  ts: at(ms),
  dur: durMs * 1000,
  args: { frame, data },
});
const resource = (name: string, ms: number, data: object) => ({
  name,
  ph: "I",
  pid: 1,
  tid: 2,
  ts: at(ms),
  args: { data },
});

function build() {
  return parseTrace({
    traceEvents: [
      meta,
      R("navigationStart", 0, { isOutermostMainFrame: true, documentLoaderURL: "https://x.test/" }),
      // Document: response headers at 100 ms.
      resource("ResourceSendRequest", 10, { requestId: "doc", url: "https://x.test/", resourceType: "Document" }),
      resource("ResourceReceiveResponse", 110, { requestId: "doc", statusCode: 200, timing: { requestTime: 1, receiveHeadersEnd: 100 } }),
      resource("ResourceFinish", 120, { requestId: "doc", encodedDataLength: 5000, decodedBodyLength: 9000 }),
      R("firstPaint", 450, {}),
      // Render-blocking stylesheet: 150 ms → 400 ms.
      resource("ResourceSendRequest", 150, { requestId: "css", url: "https://x.test/a.css", resourceType: "Stylesheet", renderBlocking: "blocking" }),
      resource("ResourceFinish", 400, { requestId: "css", encodedDataLength: 2048 }),
      // Third-party LCP image: 300 ms → 350 ms network finish, 500 ms decode.
      resource("ResourceSendRequest", 300, { requestId: "img", url: "https://cdn.test/a.png", resourceType: "Image" }),
      resource("ResourceFinish", 500, {
        requestId: "img",
        encodedDataLength: 1234,
        // `finishTime` (seconds) is authoritative; the event's ts is post-decode.
        finishTime: T0 / 1e6 + 0.35,
      }),
      // A request from before the navigation must not inflate third-party totals.
      resource("ResourceSendRequest", -50, { requestId: "old", url: "https://old.test/x.js", resourceType: "Script" }),
      resource("ResourceFinish", -10, { requestId: "old", encodedDataLength: 999 }),
      R("largestContentfulPaint::Candidate", 1000, {
        nodeName: "IMG",
        type: "image",
        size: 100,
        nodeId: 5,
        // Deliberately disagree with the network request: the request wins.
        imageLoadStart: 600,
        imageLoadEnd: 700,
      }),
      R("LargestImagePaint::Candidate", 1000, { DOMNodeId: 5, imageUrl: "https://cdn.test/a.png" }),
      // Two layout-shift session windows: 1200/1500 ms, then 4000 ms.
      R("LayoutShift", 1200, { score: 0.05, had_recent_input: false, is_main_frame: true, impacted_nodes: [{ debug_name: "IMG" }] }),
      R("LayoutShift", 1500, { score: 0.02, had_recent_input: false, is_main_frame: true, impacted_nodes: [{ debug_name: "P" }] }),
      R("LayoutShift", 4000, { score: 0.03, had_recent_input: false, is_main_frame: true, impacted_nodes: [{ debug_name: "H1" }] }),
      // One interaction: 200 ms total, 10 input + 50 processing + 140 presentation.
      { name: "EventTiming", ph: "b", id: "e1", pid: 1, tid: 2, ts: at(2000), args: { data: { type: "pointerdown", interactionId: 7, timeStamp: 3000, processingStart: 3010, processingEnd: 3060, duration: 200, nodeName: "BUTTON" } } },
      { name: "EventTiming", ph: "e", id: "e1", pid: 1, tid: 2, ts: at(2200) },
      // CPU samples attributed to the third-party script.
      { name: "Profile", ph: "P", pid: 1, tid: 2, ts: at(0), args: { data: { startTime: T0 } } },
      {
        name: "ProfileChunk",
        ph: "P",
        pid: 1,
        tid: 2,
        ts: at(10),
        args: {
          data: {
            cpuProfile: {
              nodes: [
                { id: 1, callFrame: { functionName: "(root)" } },
                { id: 2, parent: 1, callFrame: { functionName: "work", url: "https://cdn.test/a.js", lineNumber: 1 } },
              ],
              samples: [2, 2],
            },
            timeDeltas: [10_000, 10_000],
          },
        },
      },
      X("RunTask", 0, 100),
    ],
  });
}

describe("trace insights", () => {
  it("splits LCP into DevTools subparts", () => {
    const lcp = buildLcpBreakdown(build());
    expect(lcp?.timeMs).toBe(1000);
    expect(lcp?.url).toBe("https://cdn.test/a.png");
    expect(Object.fromEntries((lcp?.subparts ?? []).map((s) => [s.key, Math.round(s.ms)]))).toEqual({
      ttfb: 100,
      loadDelay: 200,
      // The network finishTime (350 ms), not the post-decode ResourceFinish ts (500 ms).
      loadDuration: 50,
      renderDelay: 650,
    });
  });

  it("matches the LCP request by timing when the URL repeats", () => {
    const t = parseTrace({
      traceEvents: [
        meta,
        R("navigationStart", 0, { isOutermostMainFrame: true, documentLoaderURL: "https://x.test/" }),
        resource("ResourceSendRequest", 10, { requestId: "doc", url: "https://x.test/", resourceType: "Document" }),
        resource("ResourceReceiveResponse", 110, { requestId: "doc", statusCode: 200, timing: { requestTime: 1, receiveHeadersEnd: 100 } }),
        resource("ResourceFinish", 120, { requestId: "doc", encodedDataLength: 5000 }),
        // Same image URL twice: an early preload, then the actual LCP load.
        resource("ResourceSendRequest", 150, { requestId: "pre", url: "https://cdn.test/a.png", resourceType: "Image" }),
        resource("ResourceFinish", 200, { requestId: "pre", encodedDataLength: 100, finishTime: T0 / 1e6 + 0.2 }),
        resource("ResourceSendRequest", 300, { requestId: "img", url: "https://cdn.test/a.png", resourceType: "Image" }),
        resource("ResourceFinish", 900, { requestId: "img", encodedDataLength: 2000, finishTime: T0 / 1e6 + 0.4 }),
        R("largestContentfulPaint::Candidate", 700, {
          nodeName: "IMG",
          type: "image",
          size: 100,
          nodeId: 5,
          imageLoadStart: 300,
          imageLoadEnd: 400,
        }),
        R("LargestImagePaint::Candidate", 700, { DOMNodeId: 5, imageUrl: "https://cdn.test/a.png" }),
      ],
    });
    const parts = Object.fromEntries((buildLcpBreakdown(t)?.subparts ?? []).map((s) => [s.key, Math.round(s.ms)]));
    // The second request (300–400 ms), not the preload (150–200 ms), drives the breakdown.
    expect(parts).toEqual({ ttfb: 100, loadDelay: 200, loadDuration: 100, renderDelay: 300 });
  });

  it("matches LCP requests on the same clock when the trace starts before navigation", () => {
    const t = parseTrace({
      traceEvents: [
        meta,
        // A pre-navigation resource makes trace start 50 ms before navigation,
        // so trace-relative and navigation-relative times differ.
        resource("ResourceSendRequest", -50, { requestId: "old", url: "https://old.test/x.js", resourceType: "Script" }),
        R("navigationStart", 0, { isOutermostMainFrame: true, documentLoaderURL: "https://x.test/" }),
        resource("ResourceSendRequest", 10, { requestId: "doc", url: "https://x.test/", resourceType: "Document" }),
        resource("ResourceReceiveResponse", 110, { requestId: "doc", statusCode: 200, timing: { requestTime: 1, receiveHeadersEnd: 100 } }),
        resource("ResourceFinish", 120, { requestId: "doc", encodedDataLength: 5000 }),
        // The real LCP load is nav 300→400. A decoy preload at nav 250→350 is
        // closer in trace-relative terms, so the origin must be subtracted.
        resource("ResourceSendRequest", 300, { requestId: "img", url: "https://cdn.test/a.png", resourceType: "Image" }),
        resource("ResourceFinish", 900, { requestId: "img", encodedDataLength: 2000, finishTime: T0 / 1e6 + 0.4 }),
        resource("ResourceSendRequest", 250, { requestId: "decoy", url: "https://cdn.test/a.png", resourceType: "Image" }),
        resource("ResourceFinish", 900, { requestId: "decoy", encodedDataLength: 100, finishTime: T0 / 1e6 + 0.35 }),
        R("largestContentfulPaint::Candidate", 700, {
          nodeName: "IMG",
          type: "image",
          size: 100,
          nodeId: 5,
          imageLoadStart: 300,
          imageLoadEnd: 400,
        }),
        R("LargestImagePaint::Candidate", 700, { DOMNodeId: 5, imageUrl: "https://cdn.test/a.png" }),
      ],
    });
    const parts = Object.fromEntries((buildLcpBreakdown(t)?.subparts ?? []).map((s) => [s.key, Math.round(s.ms)]));
    expect(parts).toEqual({ ttfb: 100, loadDelay: 200, loadDuration: 100, renderDelay: 300 });
  });

  it("groups shifts into 1 s / 5 s session windows and reports the worst window", () => {
    const cls = buildClsClusters(build());
    expect(cls.clusters).toHaveLength(2);
    expect(cls.clusters[0].score).toBeCloseTo(0.07);
    expect(cls.clusters[0].nodes).toEqual(["IMG", "P"]);
    // CLS is the worst session window, not the sum of both windows (0.07, not 0.10).
    expect(cls.score).toBeCloseTo(0.07);
    // The load analysis and API metrics must report the same value as the card.
    expect(analyzeLoad(build()).cls).toBeCloseTo(0.07);
  });

  it("derives INP subparts from EventTiming", () => {
    const inp = buildInp(build());
    expect(inp?.valueMs).toBe(200);
    expect(inp?.longest).toMatchObject({
      type: "pointerdown",
      target: "BUTTON",
      inputDelayMs: 10,
      processingMs: 50,
      presentationMs: 140,
    });
  });

  it("lists render-blocking resources and third parties", () => {
    const trace = build();
    const insights = buildInsights(trace, analyzeLoad(trace));
    expect(insights.renderBlocking.map((r) => r.url)).toEqual(["https://x.test/a.css"]);
    expect(insights.renderBlocking[0].durationMs).toBe(250);
    const cdn = insights.thirdParties.find((t) => t.origin === "https://cdn.test");
    expect(cdn).toMatchObject({ requests: 1, transferBytes: 1234 });
    expect(cdn?.mainThreadMs).toBeCloseTo(10);
    // Requests from before the navigation are not part of this page load.
    expect(insights.thirdParties.map((t) => t.origin)).toEqual(["https://cdn.test"]);
  });

  it("excludes potentially-blocking and post-first-paint requests", () => {
    const trace = parseTrace({
      traceEvents: [
        meta,
        R("navigationStart", 0, { isOutermostMainFrame: true, documentLoaderURL: "https://x.test/" }),
        R("firstPaint", 200, {}),
        resource("ResourceSendRequest", 50, { requestId: "a", url: "https://x.test/a.css", resourceType: "Stylesheet", renderBlocking: "blocking" }),
        resource("ResourceFinish", 150, { requestId: "a" }),
        resource("ResourceSendRequest", 60, { requestId: "b", url: "https://x.test/b.css", resourceType: "Stylesheet", renderBlocking: "potentially_blocking" }),
        resource("ResourceFinish", 160, { requestId: "b" }),
        resource("ResourceSendRequest", 180, { requestId: "c", url: "https://x.test/c.js", resourceType: "Script", renderBlocking: "blocking" }),
        resource("ResourceFinish", 300, { requestId: "c" }),
      ],
    });
    const insights = buildInsights(trace, analyzeLoad(trace));
    expect(insights.renderBlocking.map((r) => r.url)).toEqual(["https://x.test/a.css"]);
  });

  it("applies DevTools' priority, preload and frame rules", () => {
    const trace = parseTrace({
      traceEvents: [
        meta,
        R("navigationStart", 0, { isOutermostMainFrame: true, documentLoaderURL: "https://x.test/" }),
        R("firstPaint", 200, {}),
        // in_body_parser_blocking counts only at VeryHigh, or High for scripts.
        resource("ResourceSendRequest", 10, { requestId: "a", frame, url: "https://x.test/a.css", resourceType: "Stylesheet", priority: "VeryHigh", renderBlocking: "in_body_parser_blocking" }),
        resource("ResourceFinish", 100, { requestId: "a" }),
        resource("ResourceSendRequest", 11, { requestId: "b", frame, url: "https://x.test/b.js", resourceType: "Script", priority: "High", renderBlocking: "in_body_parser_blocking" }),
        resource("ResourceFinish", 100, { requestId: "b" }),
        resource("ResourceSendRequest", 12, { requestId: "c", frame, url: "https://x.test/c.css", resourceType: "Stylesheet", priority: "High", renderBlocking: "in_body_parser_blocking" }),
        resource("ResourceFinish", 100, { requestId: "c" }),
        // A preload that later becomes render-blocking.
        resource("ResourceSendRequest", 13, { requestId: "d", frame, url: "https://x.test/d.css", resourceType: "Stylesheet", renderBlocking: "non_blocking" }),
        resource("PreloadRenderBlockingStatusChange", 14, { requestId: "d", renderBlocking: "blocking" }),
        resource("ResourceFinish", 100, { requestId: "d" }),
        // Blocking in a different frame (e.g. an iframe) does not count.
        resource("ResourceSendRequest", 15, { requestId: "e", frame: "OTHER", url: "https://x.test/e.css", resourceType: "Stylesheet", renderBlocking: "blocking" }),
        resource("ResourceFinish", 100, { requestId: "e" }),
      ],
    });
    const urls = buildInsights(trace, analyzeLoad(trace)).renderBlocking.map((r) => r.url).sort();
    expect(urls).toEqual(["https://x.test/a.css", "https://x.test/b.js", "https://x.test/d.css"]);
  });

  it("reports no render-blocking resources without a first paint", () => {
    const trace = parseTrace({
      traceEvents: [
        meta,
        R("navigationStart", 0, { isOutermostMainFrame: true, documentLoaderURL: "https://x.test/" }),
        resource("ResourceSendRequest", 10, { requestId: "a", url: "https://x.test/a.css", resourceType: "Stylesheet", renderBlocking: "blocking" }),
        resource("ResourceFinish", 100, { requestId: "a" }),
      ],
    });
    expect(buildInsights(trace, analyzeLoad(trace)).renderBlocking).toEqual([]);
  });

  it("ignores non-http origins such as chrome-extension in third parties", () => {
    const trace = parseTrace({
      traceEvents: [
        meta,
        R("navigationStart", 0, { isOutermostMainFrame: true, documentLoaderURL: "https://x.test/" }),
        { name: "Profile", ph: "P", pid: 1, tid: 2, ts: at(0), args: { data: { startTime: T0 } } },
        {
          name: "ProfileChunk",
          ph: "P",
          pid: 1,
          tid: 2,
          ts: at(10),
          args: {
            data: {
              cpuProfile: {
                nodes: [
                  { id: 1, callFrame: { functionName: "(root)" } },
                  { id: 2, parent: 1, callFrame: { functionName: "ext", url: "chrome-extension://abc/x.js", lineNumber: 1 } },
                ],
                samples: [2],
              },
              timeDeltas: [10_000],
            },
          },
        },
      ],
    });
    expect(buildInsights(trace, analyzeLoad(trace)).thirdParties).toEqual([]);
  });
});
