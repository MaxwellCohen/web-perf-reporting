export const T = 1_000_000;
export const frame = "F1";
export const nav = "N1";
const pid = 1;
const tid = 2;

const R = (name: string, offsetMs: number, data: object) => ({
  name,
  ph: "R",
  pid,
  tid,
  ts: T + offsetMs * 1000,
  cat: "loading,rail,devtools.timeline",
  args: { frame, data },
});

const I = (name: string, offsetMs: number, data: object) => ({
  name,
  ph: "I",
  pid,
  tid,
  ts: T + offsetMs * 1000,
  cat: "devtools.timeline",
  args: { frame, data },
});

/** Small but complete trace: navigation, document + image requests, FCP/LCP, one shift, one interaction, one task. */
export function miniTrace() {
  return {
    traceEvents: [
      { name: "thread_name", ph: "M", pid, tid, ts: 0, args: { name: "CrRendererMain" } },
      {
        name: "TracingStartedInBrowser",
        ph: "I",
        pid: 9,
        tid: 9,
        ts: T - 100_000,
        cat: "disabled-by-default-devtools.timeline",
        args: {
          data: {
            frameTreeNodeId: 1,
            frames: [
              { frame, isInPrimaryMainFrame: true, isOutermostMainFrame: true, processId: pid, url: "about:blank" },
            ],
            persistentIds: true,
          },
        },
      },
      {
        name: "navigationStart",
        ph: "R",
        pid,
        tid,
        ts: T,
        cat: "blink.user_timing",
        args: {
          frame,
          data: {
            documentLoaderURL: "https://x.test/",
            isLoadingMainFrame: true,
            isOutermostMainFrame: true,
            navigationId: nav,
          },
        },
      },
      {
        name: "FrameCommittedInBrowser",
        ph: "I",
        pid: 9,
        tid: 9,
        ts: T + 1000,
        cat: "disabled-by-default-devtools.timeline",
        args: {
          data: { frame, isInPrimaryMainFrame: true, isOutermostMainFrame: true, processId: pid, url: "https://x.test/" },
        },
      },
      I("ResourceSendRequest", 10, { requestId: "doc", url: "https://x.test/", resourceType: "Document", priority: "VeryHigh" }),
      I("ResourceReceiveResponse", 110, {
        requestId: "doc",
        statusCode: 200,
        mimeType: "text/html",
        encodedDataLength: 5000,
        timing: { requestTime: T / 1e6, receiveHeadersEnd: 100 },
      }),
      I("ResourceFinish", 120, {
        requestId: "doc",
        encodedDataLength: 5000,
        decodedBodyLength: 9000,
        finishTime: T / 1e6 + 0.12,
      }),
      {
        name: "firstContentfulPaint",
        ph: "R",
        pid,
        tid,
        ts: T + 900_000,
        cat: "blink.user_timing",
        args: { frame, data: { navigationId: nav } },
      },
      R("largestContentfulPaint::Candidate", 2500, {
        candidateIndex: 1,
        nodeName: "IMG",
        type: "image",
        size: 100,
        nodeId: 5,
        imageLoadStart: 300,
        imageLoadEnd: 500,
        navigationId: nav,
      }),
      R("LargestImagePaint::Candidate", 2500, {
        candidateIndex: 1,
        DOMNodeId: 5,
        imageUrl: "https://cdn.test/a.png",
      }),
      I("LayoutShift", 1200, {
        navigationId: nav,
        score: 0.05,
        weighted_score_delta: 0.05,
        had_recent_input: false,
        impacted_nodes: [{ node_id: 5, tag_name: "IMG", debug_name: "IMG" }],
      }),
      {
        name: "EventTiming",
        ph: "b",
        id: "e1",
        pid,
        tid,
        ts: T + 2_000_000,
        cat: "devtools.timeline",
        args: {
          data: {
            type: "pointerdown",
            interactionId: 7,
            timeStamp: 3000,
            processingStart: 3010,
            processingEnd: 3060,
            duration: 200,
            nodeName: "BUTTON",
          },
        },
      },
      { name: "EventTiming", ph: "e", id: "e1", pid, tid, ts: T + 2_200_000, cat: "devtools.timeline", args: { data: {} } },
      {
        name: "RunTask",
        ph: "X",
        pid,
        tid,
        ts: T + 100_000,
        dur: 100_000,
        cat: "toplevel",
        args: { data: {} },
      },
      {
        name: "FunctionCall",
        ph: "X",
        pid,
        tid,
        ts: T + 110_000,
        dur: 50_000,
        cat: "devtools.timeline",
        args: {
          data: {
            functionName: "work",
            url: "https://cdn.test/a.js",
            lineNumber: 3,
            columnNumber: 0,
            scriptId: "1",
          },
        },
      },
    ],
  };
}
