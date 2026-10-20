import { describe, expect, it } from "vitest";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { buildPageLoadTimeline, buildPageLoadTimelines } from "./buildPageLoadTimeline";
import type { PageLoadTimeline } from "./types";

function findMarked(timeline: PageLoadTimeline, id: string) {
  for (const step of timeline.events) {
    if (step.id === id) return step;
    const note = step.notes?.find((item) => item.id === id);
    if (note) return note;
  }
  return undefined;
}

const MILESTONE_EVENT: Record<string, string> = {
  "m-fcp": "render-fcp",
  "m-lcp": "sub-lcp",
  "m-dcl": "parse-dcl",
  "m-ttfb": "req-ttfb",
  "m-load": "sub-load",
  "m-last": "sub-last-visual",
};

function milestone(timeline: PageLoadTimeline, id: string) {
  return findMarked(timeline, MILESTONE_EVENT[id] ?? id);
}

function lcpSegments(timeline: PageLoadTimeline) {
  return timeline.events.find((e) => e.id === "sub-lcp")?.lcpSegments ?? [];
}

function networkBars(timeline: PageLoadTimeline) {
  const bars: Array<{
    url: string;
    startMs: number;
    endMs: number;
    statusCode?: number;
    priority?: string;
    isRenderBlocking: boolean;
  }> = [];
  for (const event of timeline.events) {
    const rows = event.table?.rows ?? [];
    (event.waterfall ?? []).forEach((bar, index) => {
      if (!bar.href && event.id !== "nav-redirects") return;
      const url = bar.href ?? "";
      let statusCode: number | undefined;
      const statusCell = rows[index]?.find((cell) => /^status \d+/.test(cell.text));
      if (statusCell) {
        statusCode = Number(statusCell.text.replace(/^status\s+/, ""));
      } else if (event.detail.includes("status ") && (event.waterfall?.length ?? 0) === 1) {
        const match = event.detail.match(/status (\d+)/);
        if (match) statusCode = Number(match[1]);
      }
      bars.push({
        url,
        startMs: bar.startMs,
        endMs: bar.endMs,
        statusCode,
        priority: bar.priority,
        isRenderBlocking: bar.renderBlocking === "blocking",
      });
    });
  }
  return bars;
}

function mainThreadBlocks(timeline: PageLoadTimeline) {
  return timeline.events
    .filter((event) => event.id.startsWith("long-task-"))
    .flatMap((event) =>
      (event.waterfall ?? []).map((bar) => ({
        startMs: bar.startMs,
        durationMs: Number((bar.endMs - bar.startMs).toPrecision(12)),
        url: bar.href,
      })),
    );
}

function makeItem(overrides: {
  label?: string;
  metrics?: Record<string, unknown>;
  networkRequests?: Array<Record<string, unknown>>;
  filmstrip?: Array<{ timing: number; data: string; timestamp?: number }>;
  longTasks?: Array<{ url?: string; startTime: number; duration: number }>;
  mainThreadTasks?: Array<{ startTime: number; duration: number }>;
  lcpSubparts?: Array<{ subpart: string; label: string; duration: number }>;
  lcpNodeLabel?: string;
  renderBlocking?: Array<{ url: string; wastedMs?: number }>;
  serverResponseMs?: number | null;
  redirectsMs?: number;
  protocol?: string;
  rtt?: number;
  preconnectCandidates?: Array<{ origin: string; wastedMs: number }>;
  chainUrls?: string[];
  /** navStartToEndTime for each chainUrls entry, in order. */
  chainEndTimes?: number[];
  bootupTime?: Array<{
    url: string;
    total?: number;
    scripting?: number;
    scriptParseCompile?: number;
  }>;
  fontDisplayItems?: unknown[];
  unsizedImages?: unknown[];
  cls?: number;
  diagnostics?: Record<string, unknown>;
  domSize?: Array<{ statistic: string; value: number; nodeLabel?: string }>;
  documentResourceSize?: number;
  discovery?: {
    requestDiscoverable?: boolean;
    priorityHinted?: boolean;
    eagerlyLoaded?: boolean;
  };
  workBreakdown?: Array<{ group: string; groupLabel: string; duration: number }>;
  unusedJavascript?: Array<Record<string, unknown>>;
  unusedCss?: Array<Record<string, unknown>>;
  scriptTreemap?: Array<{ name: string; unusedBytes?: number; resourceBytes?: number }>;
  userTimings?: Array<{
    name: string;
    timingType: string;
    startTime: number;
    duration?: number;
  }>;
  layoutShifts?: Array<{
    startTime?: number;
    score: number;
    node?: { type?: string; nodeLabel?: string; value?: string };
  }>;
  formFactor?: "mobile" | "desktop";
  throttlingMethod?: string;
  throttling?: {
    rttMs: number;
    throughputKbps: number;
    cpuSlowdownMultiplier: number;
  };
}): InsightsContextItem {
  const metrics = {
    timeToFirstByte: 200,
    observedFirstContentfulPaint: 1200,
    observedLargestContentfulPaint: 2500,
    observedFirstPaint: 1100,
    observedFirstVisualChange: 1050,
    observedDomContentLoaded: 900,
    observedLoad: 1500,
    observedLastVisualChange: 3000,
    interactive: 5000,
    observedTraceEnd: 6000,
    totalBlockingTime: 400,
    cumulativeLayoutShift: overrides.cls ?? 0.05,
    observedNavigationStart: 0,
    ...overrides.metrics,
  };

  const networkRequests = overrides.networkRequests ?? [
    {
      url: "https://example.com/",
      resourceType: "Document",
      networkRequestTime: 5,
      networkEndTime: 250,
      transferSize: 40000,
      resourceSize: overrides.documentResourceSize ?? 120000,
      statusCode: 200,
      protocol: overrides.protocol ?? "h2",
      mimeType: "text/html",
    },
    {
      url: "https://example.com/app.css",
      resourceType: "Stylesheet",
      networkRequestTime: 80,
      networkEndTime: 400,
      transferSize: 8000,
      statusCode: 200,
      protocol: "h2",
    },
    {
      url: "https://example.com/font.woff2",
      resourceType: "Font",
      networkRequestTime: 400,
      networkEndTime: 1400,
      transferSize: 30000,
      statusCode: 200,
      protocol: "h2",
      isLinkPreload: false,
    },
    {
      url: "https://cdn.example.com/tag.js",
      resourceType: "Script",
      networkRequestTime: 100,
      networkEndTime: 500,
      transferSize: 50000,
      statusCode: 200,
      protocol: "h2",
      entity: "cdn.example.com",
    },
  ];

  const lcpItems: unknown[] = [
    {
      type: "table",
      headings: [],
      items: overrides.lcpSubparts ?? [
        { subpart: "timeToFirstByte", label: "Time to first byte", duration: 200 },
        { subpart: "resourceLoadDelay", label: "Resource load delay", duration: 100 },
        { subpart: "resourceLoadDuration", label: "Resource load duration", duration: 50 },
        { subpart: "elementRenderDelay", label: "Element render delay", duration: 2150 },
      ],
    },
  ];
  if (overrides.lcpNodeLabel) {
    lcpItems.push({
      type: "node",
      lhId: "lcp-node",
      nodeLabel: overrides.lcpNodeLabel,
      snippet: "<div>",
    });
  }

  const discoveryChecklist = overrides.discovery
    ? {
        type: "checklist",
        items: {
          requestDiscoverable: {
            label: "Request is discoverable in initial document",
            value: overrides.discovery.requestDiscoverable ?? true,
          },
          priorityHinted: {
            label: "fetchpriority=high should be applied",
            value: overrides.discovery.priorityHinted ?? true,
          },
          eagerlyLoaded: {
            label: "lazy load not applied",
            value: overrides.discovery.eagerlyLoaded ?? true,
          },
        },
      }
    : undefined;

  const depItems: unknown[] = [];
  if (overrides.chainUrls?.length || overrides.preconnectCandidates) {
    if (overrides.chainUrls?.length) {
      let children: Record<string, unknown> = {};
      let cursor = children;
      for (let i = 0; i < overrides.chainUrls.length; i++) {
        const id = `n${i}`;
        const node: Record<string, unknown> = {
          url: overrides.chainUrls[i],
          transferSize: 1000,
          navStartToEndTime: overrides.chainEndTimes?.[i] ?? 100 * (i + 1),
          isLongest: i === overrides.chainUrls.length - 1,
          children: {},
        };
        if (i === 0) {
          children = { [id]: node };
          cursor = node.children as Record<string, unknown>;
        } else {
          cursor[id] = node;
          cursor = node.children as Record<string, unknown>;
        }
      }
      depItems.push({
        type: "list-section",
        value: {
          type: "network-tree",
          longestChain: { duration: 800 },
          chains: {
            root: {
              url: "https://example.com/",
              children,
              transferSize: 40000,
              navStartToEndTime: 250,
            },
          },
        },
      });
    }
    depItems.push({
      type: "list-section",
      title: "Preconnected origins",
      value: { type: "text", value: "no origins were preconnected" },
    });
    if (overrides.preconnectCandidates?.length) {
      depItems.push({
        type: "list-section",
        title: "Preconnect candidates",
        value: {
          items: overrides.preconnectCandidates,
          headings: [],
        },
      });
    }
  }

  const audits: Record<string, unknown> = {
    metrics: {
      id: "metrics",
      details: { type: "debugdata", items: [metrics] },
    },
    "network-requests": {
      id: "network-requests",
      details: { type: "table", items: networkRequests, headings: [] },
    },
    "screenshot-thumbnails": {
      id: "screenshot-thumbnails",
      details: {
        type: "filmstrip",
        scale: 1,
        items: (
          overrides.filmstrip ?? [
            { timing: 800, data: "img-early", timestamp: 800 },
            { timing: 1300, data: "img-fcp", timestamp: 1300 },
            { timing: 2600, data: "img-lcp", timestamp: 2600 },
          ]
        ).map((f) => ({ ...f, timestamp: f.timestamp ?? f.timing })),
      },
    },
    "long-tasks": {
      id: "long-tasks",
      details: {
        type: "table",
        items: overrides.longTasks ?? [
          {
            url: "https://example.com/app.js",
            startTime: 1300,
            duration: 300,
          },
          {
            url: "https://cdn.example.com/tag.js",
            startTime: 1600,
            duration: 120,
          },
        ],
        headings: [],
      },
    },
    ...(overrides.mainThreadTasks
      ? {
          "main-thread-tasks": {
            id: "main-thread-tasks",
            details: { type: "table", items: overrides.mainThreadTasks, headings: [] },
          },
        }
      : {}),
    "lcp-breakdown-insight": {
      id: "lcp-breakdown-insight",
      details: { type: "list", items: lcpItems },
    },
    "render-blocking-insight": {
      id: "render-blocking-insight",
      details: {
        type: "table",
        items: overrides.renderBlocking ?? [],
        headings: [],
      },
    },
    ...(overrides.serverResponseMs === null
      ? {}
      : {
          "server-response-time": {
            id: "server-response-time",
            numericValue: overrides.serverResponseMs ?? 80,
          },
        }),
    redirects: {
      id: "redirects",
      numericValue: overrides.redirectsMs ?? 0,
      details: { type: "opportunity", items: [], headings: [] },
    },
    "network-rtt": {
      id: "network-rtt",
      details: {
        type: "table",
        items: [{ origin: "https://example.com", rtt: overrides.rtt ?? 40 }],
        headings: [],
      },
    },
    "font-display-insight": {
      id: "font-display-insight",
      details: { type: "table", items: overrides.fontDisplayItems ?? [], headings: [] },
    },
    "unsized-images": {
      id: "unsized-images",
      details: { type: "table", items: overrides.unsizedImages ?? [], headings: [] },
    },
    "layout-shifts": {
      id: "layout-shifts",
      details: { type: "table", items: overrides.layoutShifts ?? [], headings: [] },
    },
    "cls-culprits-insight": {
      id: "cls-culprits-insight",
      details: { type: "list", items: [] },
    },
    diagnostics: {
      id: "diagnostics",
      details: {
        type: "debugdata",
        items: [overrides.diagnostics ?? { numFonts: 2, numScripts: 10 }],
      },
    },
    "mainthread-work-breakdown": {
      id: "mainthread-work-breakdown",
      details: {
        type: "table",
        items: overrides.workBreakdown ?? [
          { group: "scriptEvaluation", groupLabel: "Script Evaluation", duration: 800 },
          { group: "styleLayout", groupLabel: "Style & Layout", duration: 120 },
          { group: "paintCompositeRender", groupLabel: "Rendering", duration: 40 },
          { group: "parseHTML", groupLabel: "Parse HTML & CSS", duration: 30 },
        ],
        headings: [],
      },
    },
  };

  if (discoveryChecklist) {
    audits["lcp-discovery-insight"] = {
      id: "lcp-discovery-insight",
      details: { type: "list", items: [discoveryChecklist] },
    };
  }

  if (depItems.length) {
    audits["network-dependency-tree-insight"] = {
      id: "network-dependency-tree-insight",
      details: { type: "list", items: depItems },
    };
  }

  if (overrides.bootupTime) {
    audits["bootup-time"] = {
      id: "bootup-time",
      details: { type: "table", items: overrides.bootupTime, headings: [] },
    };
  }

  if (overrides.unusedJavascript) {
    audits["unused-javascript"] = {
      id: "unused-javascript",
      details: { type: "opportunity", items: overrides.unusedJavascript, headings: [] },
    };
  }
  if (overrides.unusedCss) {
    audits["unused-css-rules"] = {
      id: "unused-css-rules",
      details: { type: "opportunity", items: overrides.unusedCss, headings: [] },
    };
  }
  if (overrides.scriptTreemap) {
    audits["script-treemap-data"] = {
      id: "script-treemap-data",
      details: { nodes: overrides.scriptTreemap },
    };
  }

  if (overrides.domSize?.length) {
    audits["dom-size-insight"] = {
      id: "dom-size-insight",
      details: {
        type: "table",
        items: overrides.domSize.map((row) => ({
          statistic: row.statistic,
          value: { type: "numeric", value: row.value, granularity: 1 },
          ...(row.nodeLabel
            ? { node: { type: "node", nodeLabel: row.nodeLabel, snippet: "<div>" } }
            : {}),
        })),
      },
    };
  }

  if (overrides.userTimings?.length) {
    audits["user-timings"] = {
      id: "user-timings",
      details: { type: "table", items: overrides.userTimings, headings: [] },
    };
  }

  const configSettings =
    overrides.formFactor || overrides.throttlingMethod || overrides.throttling
      ? {
          formFactor: overrides.formFactor,
          throttlingMethod: overrides.throttlingMethod,
          throttling: overrides.throttling,
        }
      : undefined;

  return {
    label: overrides.label ?? "Mobile",
    item: {
      lighthouseResult: { audits, configSettings },
    } as InsightsContextItem["item"],
  };
}

describe("buildPageLoadTimeline", () => {
  it("returns null when audits or metrics are missing", () => {
    expect(
      buildPageLoadTimeline({
        label: "Empty",
        item: {} as InsightsContextItem["item"],
      }),
    ).toBeNull();

    expect(
      buildPageLoadTimeline({
        label: "No metrics",
        item: {
          lighthouseResult: { audits: {} },
        } as InsightsContextItem["item"],
      }),
    ).toBeNull();
  });

  it("does not offset observed times by TTFB", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        metrics: {
          timeToFirstByte: 200,
          observedFirstContentfulPaint: 1200,
          observedLargestContentfulPaint: 2500,
          observedDomContentLoaded: 900,
          observedLoad: 1500,
        },
      }),
    );

    expect(timeline).not.toBeNull();
    const fcp = milestone(timeline!, "m-fcp");
    const lcp = milestone(timeline!, "m-lcp");
    const dcl = milestone(timeline!, "m-dcl");
    expect(fcp?.timeMs).toBe(1200);
    expect(lcp?.timeMs).toBe(2500);
    expect(dcl?.timeMs).toBe(900);
  });

  it("rates TTFB and FCP with thresholds", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        metrics: {
          timeToFirstByte: 3600,
          observedFirstContentfulPaint: 3200,
          observedLargestContentfulPaint: 5000,
        },
        serverResponseMs: 950,
        networkRequests: [
          {
            url: "https://example.com/",
            resourceType: "Document",
            networkRequestTime: 5,
            networkEndTime: 1200,
            transferSize: 40000,
            resourceSize: 120000,
            statusCode: 200,
            protocol: "h2",
            mimeType: "text/html",
          },
        ],
      }),
    );

    const ttfb = milestone(timeline!, "m-ttfb");
    const fcp = milestone(timeline!, "m-fcp");
    expect(ttfb?.timeMs).toBe(955);
    expect(ttfb?.rating).toBe("needs-improvement");
    expect(fcp?.rating).toBe("poor");
      });

  it("emits only timed milestones, network rows, and long tasks", () => {
    const timeline = buildPageLoadTimeline(makeItem({}));
    expect(timeline).not.toBeNull();

    const steps = timeline!.events;
    expect(steps.every((s) => s.status === "measured")).toBe(true);
    expect(steps.every((s) => s.timeMs != null)).toBe(true);
    expect(steps.some((s) => s.status === "not-recorded")).toBe(false);
    expect(steps.some((s) => s.status === "inferred")).toBe(false);

    expect(steps.some((s) => s.id === "nav-start")).toBe(true);
    expect(findMarked(timeline!, "req-ttfb")).toBeDefined();
    expect(steps.some((s) => s.id === "render-fcp")).toBe(true);
    expect(steps.some((s) => s.id === "sub-lcp")).toBe(true);
    expect(steps.some((s) => s.id.startsWith("net-"))).toBe(true);

    expect(steps.some((s) => s.id === "conn-dns")).toBe(false);
    expect(steps.some((s) => s.id === "nav-beforeunload")).toBe(false);
    expect(steps.some((s) => s.id === "req-preload-scanner")).toBe(false);
    expect(steps.some((s) => s.id === "head-css")).toBe(false);
        expect(timeline!.events.some((e) => e.phaseId === "connection")).toBe(false);
  });

  it("creates one moment per network request with start and end", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        renderBlocking: [{ url: "https://example.com/app.css", wastedMs: 120 }],
        networkRequests: [
          {
            url: "https://example.com/",
            resourceType: "Document",
            networkRequestTime: 5,
            networkEndTime: 250,
            transferSize: 40000,
            statusCode: 200,
            protocol: "h2",
            mimeType: "text/html",
          },
          {
            url: "https://example.com/app.css",
            resourceType: "Stylesheet",
            networkRequestTime: 80,
            networkEndTime: 400,
            transferSize: 8000,
            statusCode: 200,
            protocol: "h2",
          },
          {
            url: "https://cdn.example.com/tag.js",
            resourceType: "Script",
            networkRequestTime: 100,
            networkEndTime: 500,
            transferSize: 50000,
            statusCode: 200,
            protocol: "h2",
          },
        ],
      }),
    );

    const netMoments = timeline!.events.filter((m) => m.id.startsWith("net-"));
    expect(netMoments).toHaveLength(3);
    expect(netMoments.map((m) => m.title)).toEqual([
      "Document",
      "Stylesheet downloaded",
      "Script downloaded",
    ]);

    const doc = netMoments[0];
    expect(doc?.startMs).toBe(5);
    expect(doc?.timeMs).toBe(250);
    expect(doc?.endMs).toBe(250);
    expect(doc?.detail).toMatch(/document/);
    expect(doc?.table?.rows[0]?.[0]).toMatchObject({
      text: "example.com/",
      href: "https://example.com/",
    });

    const css = netMoments.find((m) => m.title === "Stylesheet downloaded");
    expect(css?.kind).toBe("blocking");

    expect(doc?.notes?.some((note) => note.title === "Server think time")).toBeFalsy();
    const server = timeline!.events.find((moment) => moment.id === "req-server");
    expect(server).toMatchObject({
      title: "Server think time",
      kind: "marker",
      phaseId: "requestResponse",
      startMs: 5,
      timeMs: 85,
      endMs: 85,
      detail: "Root document server response took 80 ms.",
    });
    const ttfb = timeline!.events.find((moment) => moment.id === "req-ttfb");
    expect(ttfb?.timeMs).toBe(85);
    expect(ttfb?.title).toBe("TTFB");
    expect(css?.waterfall?.[0]?.renderBlocking).toBe("blocking");
    expect(netMoments.find((m) => m.title === "Script downloaded")?.waterfall?.[0]?.renderBlocking).toBe(
      "non-blocking",
    );
  });

  it("adds coverage to each stylesheet and script", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        unusedCss: [
          {
            url: "https://example.com/app.css?v=2",
            wastedBytes: 6000,
            totalBytes: 8000,
          },
          { url: ".inline-rule{color:red}", wastedBytes: 100, totalBytes: 100 },
        ],
        unusedJavascript: [
          {
            url: "https://cdn.example.com/tag.js",
            wastedBytes: 25000,
            wastedPercent: 50,
          },
        ],
        scriptTreemap: [
          {
            name: "https://cdn.example.com/tag.js",
            resourceBytes: 1000,
            unusedBytes: 0,
          },
          {
            name: "https://example.com/used.js",
            resourceBytes: 4096,
            unusedBytes: 0,
          },
        ],
        networkRequests: [
          {
            url: "https://example.com/",
            resourceType: "Document",
            networkRequestTime: 5,
            networkEndTime: 250,
            transferSize: 40000,
            statusCode: 200,
            mimeType: "text/html",
          },
          {
            url: "https://example.com/app.css",
            resourceType: "Stylesheet",
            networkRequestTime: 80,
            networkEndTime: 400,
            transferSize: 8000,
            statusCode: 200,
          },
          {
            url: "https://cdn.example.com/tag.js",
            resourceType: "Script",
            networkRequestTime: 100,
            networkEndTime: 500,
            transferSize: 50000,
            statusCode: 200,
          },
          {
            url: "https://example.com/used.js",
            resourceType: "Script",
            networkRequestTime: 600,
            networkEndTime: 700,
            transferSize: 2000,
            statusCode: 200,
          },
          {
            url: "https://example.com/font.woff2",
            resourceType: "Font",
            networkRequestTime: 400,
            networkEndTime: 1400,
            transferSize: 30000,
            statusCode: 200,
          },
        ],
      }),
    );

    const css = timeline!.events.find((m) => m.title === "Stylesheet downloaded");
    expect(css?.detail).toMatch(/25% used · 2\.0 KiB used of 7\.8 KiB · 5\.9 KiB unused/);
    expect(css?.waterfall?.[0]?.coverage).toBe(
      "25% used · 2.0 KiB used of 7.8 KiB · 5.9 KiB unused",
    );

    const partial = timeline!.events.find(
      (m) => m.title === "Script downloaded" && m.detail.includes("tag.js"),
    );
    expect(partial?.detail).toMatch(/50% used · 24\.4 KiB used of 48\.8 KiB · 24\.4 KiB unused/);
    expect(partial?.waterfall?.[0]?.coverage).toBe(
      "50% used · 24.4 KiB used of 48.8 KiB · 24.4 KiB unused",
    );

    const used = timeline!.events.find(
      (m) => m.title === "Script downloaded" && m.detail.includes("used.js"),
    );
    expect(used?.waterfall?.[0]?.coverage).toBe("100% used · 4.0 KiB");

    const font = timeline!.events.find((m) => m.title === "Font");
    expect(font?.waterfall?.[0]?.coverage).toBeUndefined();
    expect(font?.detail).not.toMatch(/% used/);
  });

  it("shows coverage on each script in a burst", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        unusedJavascript: [
          { url: "https://example.com/a.js", wastedBytes: 500, totalBytes: 1000 },
          { url: "https://example.com/b.js", wastedBytes: 0, totalBytes: 2000 },
        ],
        networkRequests: [
          {
            url: "https://example.com/",
            resourceType: "Document",
            networkRequestTime: 5,
            networkEndTime: 100,
            transferSize: 1000,
            statusCode: 200,
            mimeType: "text/html",
          },
          {
            url: "https://example.com/a.js",
            resourceType: "Script",
            networkRequestTime: 200,
            networkEndTime: 400,
            transferSize: 1000,
            statusCode: 200,
          },
          {
            url: "https://example.com/b.js",
            resourceType: "Script",
            networkRequestTime: 205,
            networkEndTime: 450,
            transferSize: 2000,
            statusCode: 200,
          },
        ],
      }),
    );

    const burst = timeline!.events.find((m) => m.title === "2 Scripts downloaded");
    expect(burst?.waterfall?.map((bar) => bar.coverage)).toEqual([
      "50% used · 500 B used of 1000 B · 500 B unused",
      "100% used · 2.0 KiB",
    ]);
    expect(burst?.detail).not.toMatch(/% used/);
  });

  it("groups same-type downloads until a different resource starts between them", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        networkRequests: [
          {
            url: "https://example.com/",
            resourceType: "Document",
            networkRequestTime: 5,
            networkEndTime: 100,
            transferSize: 1000,
            statusCode: 200,
            mimeType: "text/html",
          },
          {
            url: "https://example.com/a.js",
            resourceType: "Script",
            networkRequestTime: 200,
            networkEndTime: 400,
            transferSize: 1000,
            statusCode: 200,
          },
          {
            url: "https://example.com/a.css",
            resourceType: "Stylesheet",
            networkRequestTime: 201,
            networkEndTime: 300,
            transferSize: 500,
            statusCode: 200,
          },
          {
            url: "https://example.com/b.js",
            resourceType: "Script",
            networkRequestTime: 205,
            networkEndTime: 450,
            transferSize: 2000,
            statusCode: 200,
          },
          {
            url: "https://example.com/c.js",
            resourceType: "Script",
            networkRequestTime: 208,
            networkEndTime: 500,
            transferSize: 3000,
            statusCode: 200,
          },
          {
            url: "https://example.com/light.svg",
            resourceType: "Image",
            networkRequestTime: 2040,
            networkEndTime: 2220,
            transferSize: 3600,
            statusCode: 200,
          },
          {
            url: "https://example.com/dark.svg",
            resourceType: "Image",
            networkRequestTime: 2080,
            networkEndTime: 2390,
            transferSize: 3600,
            statusCode: 200,
          },
          {
            url: "https://example.com/a.png",
            resourceType: "Image",
            networkRequestTime: 2100,
            networkEndTime: 2300,
            transferSize: 1000,
            statusCode: 200,
          },
          {
            url: "https://example.com/b.png",
            resourceType: "Image",
            networkRequestTime: 2102,
            networkEndTime: 2310,
            transferSize: 1000,
            statusCode: 200,
          },
          {
            url: "https://example.com/c.png",
            resourceType: "Image",
            networkRequestTime: 2105,
            networkEndTime: 2320,
            transferSize: 1000,
            statusCode: 200,
          },
          {
            url: "https://example.com/d.png",
            resourceType: "Image",
            networkRequestTime: 2108,
            networkEndTime: 2330,
            transferSize: 1000,
            statusCode: 200,
          },
          {
            url: "https://example.com/late.js",
            resourceType: "Script",
            networkRequestTime: 2500,
            networkEndTime: 2700,
            transferSize: 1000,
            statusCode: 200,
          },
          {
            url: "https://example.com/after.js",
            resourceType: "Image",
            networkRequestTime: 2600,
            networkEndTime: 2800,
            transferSize: 1000,
            statusCode: 200,
          },
        ],
      }),
    );

    const netMoments = timeline!.events.filter((m) => m.id.startsWith("net-"));
    // Ordered by download end time (stylesheet finishes before a.js).
    expect(netMoments.map((m) => m.title)).toEqual([
      "Document",
      "Stylesheet downloaded",
      "Script downloaded",
      "2 Scripts downloaded",
      "6 Images",
      "Script downloaded",
      "Image",
    ]);

    const images = netMoments.find((m) => m.title === "6 Images");
    expect(images?.startMs).toBe(2040);
    expect(images?.timeMs).toBe(2390);
    expect(images?.endMs).toBe(2390);
    expect(images?.detail).toMatch(/6 image requests/);
    expect(images?.detail).not.toMatch(/within 10 ms/);
    expect(images?.waterfall?.every((bar) => bar.renderBlocking === "non-blocking")).toBe(true);

    const earlyScript = netMoments.find((m) => m.title === "Script downloaded" && m.startMs === 200);
    expect(earlyScript?.waterfall?.[0]?.label).toMatch(/a\.js/);

    const styles = netMoments.find((m) => m.title === "Stylesheet downloaded");
    expect(styles?.waterfall?.[0]?.renderBlocking).toBe("potentially-blocking");
    expect(styles?.kind).toBe("marker");
  });

  it("labels downloads blocking, potentially blocking, or non-blocking", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        renderBlocking: [{ url: "https://example.com/app.css", wastedMs: 120 }],
        fontDisplayItems: [{ url: "https://example.com/font.woff2", wastedMs: 40 }],
        networkRequests: [
          {
            url: "https://example.com/app.css",
            resourceType: "Stylesheet",
            networkRequestTime: 80,
            networkEndTime: 200,
            transferSize: 1000,
            statusCode: 200,
          },
          {
            url: "https://example.com/print.css",
            resourceType: "Stylesheet",
            networkRequestTime: 90,
            networkEndTime: 220,
            transferSize: 500,
            statusCode: 200,
          },
          {
            url: "https://example.com/font.woff2",
            resourceType: "Font",
            networkRequestTime: 300,
            networkEndTime: 400,
            transferSize: 1000,
            statusCode: 200,
          },
          {
            url: "https://example.com/hero.png",
            resourceType: "Image",
            networkRequestTime: 310,
            networkEndTime: 500,
            transferSize: 1000,
            statusCode: 200,
            renderBlocking: "non-blocking",
          },
          {
            url: "https://example.com/body.js",
            resourceType: "Script",
            networkRequestTime: 320,
            networkEndTime: 600,
            transferSize: 1000,
            statusCode: 200,
            renderBlocking: "in_body_parser_blocking",
          },
        ],
      }),
    );

    const styles = timeline!.events.find((m) => m.title === "2 Stylesheets downloaded");
    expect(styles?.waterfall?.map((bar) => bar.renderBlocking)).toEqual([
      "blocking",
      "potentially-blocking",
    ]);
    expect(styles?.kind).toBe("blocking");
    expect(
      timeline!.events.find((m) => m.title === "Font")?.waterfall?.[0]?.renderBlocking,
    ).toBe("potentially-blocking");
    expect(
      timeline!.events.find((m) => m.title === "Image")?.waterfall?.[0]?.renderBlocking,
    ).toBe("non-blocking");
    expect(
      timeline!.events.find((m) => m.title === "Script downloaded")?.waterfall?.[0]?.renderBlocking,
    ).toBe("potentially-blocking");
    expect(networkBars(timeline!).find((bar) => bar.url.endsWith("app.css"))?.isRenderBlocking).toBe(
      true,
    );
    expect(
      networkBars(timeline!).find((bar) => bar.url.endsWith("print.css"))?.isRenderBlocking,
    ).toBe(false);
  });

  it("adds script size, download time, and coverage to an attributed long task", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        unusedJavascript: [
          {
            url: "https://cdn.example.com/tag.js?v=2",
            wastedBytes: 25000,
            wastedPercent: 50,
          },
        ],
        longTasks: [
          { url: "https://cdn.example.com/tag.js", startTime: 800, duration: 180 },
          { startTime: 2000, duration: 90 },
          { url: "https://example.com/", startTime: 3000, duration: 70 },
        ],
      }),
    );

    const attributed = timeline!.events.find(
      (moment) => moment.detail.includes("tag.js") && moment.id.startsWith("long-task-"),
    );
    expect(attributed?.waterfall?.[0]).toMatchObject({
      scriptSize: "48.8 KiB",
      downloadDuration: "400 ms",
      downloadStartMs: 100,
      downloadEndMs: 500,
      coverage: "50% used · 24.4 KiB used of 48.8 KiB · 24.4 KiB unused",
    });

    const unattributed = timeline!.events.find((moment) =>
      moment.detail.startsWith("Unattributed"),
    );
    expect(unattributed?.waterfall?.[0]?.scriptSize).toBeUndefined();
    expect(unattributed?.waterfall?.[0]?.downloadDuration).toBeUndefined();
    expect(unattributed?.waterfall?.[0]?.coverage).toBeUndefined();

    const documentTask = timeline!.events.find(
      (moment) => moment.waterfall?.[0]?.href === "https://example.com/",
    );
    expect(documentTask?.waterfall?.[0]?.scriptSize).toBeUndefined();
    expect(documentTask?.waterfall?.[0]?.coverage).toBeUndefined();
  });

  it("adds bootup cpu and critical-chain timing beside script info", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        bootupTime: [
          {
            url: "https://cdn.example.com/tag.js?v=2",
            total: 1177.7,
            scripting: 258.07,
            scriptParseCompile: 892,
          },
          { url: "Unattributable", total: 480, scripting: 65, scriptParseCompile: 0 },
        ],
        chainUrls: ["https://cdn.example.com/tag.js"],
        chainEndTimes: [595],
        longTasks: [
          { url: "https://cdn.example.com/tag.js", startTime: 800, duration: 180 },
          { startTime: 2000, duration: 90 },
        ],
      }),
    );

    const script = timeline!.events.find((moment) => moment.title === "Script downloaded");
    expect(script?.waterfall?.[0]).toMatchObject({
      scriptCpu: { totalMs: 1177.7, scriptingMs: 258.07, parseMs: 892 },
      chain: { endMs: 595, extendsMs: 345, isLongest: true },
    });

    const document = timeline!.events.find((moment) => moment.title === "Document");
    expect(document?.waterfall?.[0]?.chain).toEqual({ endMs: 250 });
    expect(document?.waterfall?.[0]?.scriptCpu).toBeUndefined();

    const attributed = timeline!.events.find(
      (moment) => moment.detail.includes("tag.js") && moment.id.startsWith("long-task-"),
    );
    expect(attributed?.waterfall?.[0]?.scriptCpu).toEqual({
      totalMs: 1177.7,
      scriptingMs: 258.07,
      parseMs: 892,
    });
    expect(attributed?.waterfall?.[0]?.chain).toEqual({
      endMs: 595,
      extendsMs: 345,
      isLongest: true,
    });

    const unattributed = timeline!.events.find((moment) =>
      moment.detail.startsWith("Unattributed"),
    );
    expect(unattributed?.waterfall?.[0]?.scriptCpu).toBeUndefined();
    expect(unattributed?.waterfall?.[0]?.chain).toBeUndefined();
  });

  it("keeps each long task on its own row even when starts are within 10 ms", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        longTasks: [
          { url: "https://example.com/a.js", startTime: 1000, duration: 80 },
          { url: "https://example.com/b.js", startTime: 1005, duration: 60 },
          { startTime: 2000, duration: 100 },
        ],
      }),
    );

    const longTasks = timeline!.events.filter((m) => m.id.startsWith("long-task-"));
    expect(longTasks.map((m) => m.title)).toEqual(["Long task", "Long task", "Long task"]);
    expect(longTasks.map((m) => m.kind)).toEqual(["blocking", "blocking", "blocking"]);
    expect(longTasks[0]?.table?.rows).toHaveLength(1);
  });

  it("groups adjacent short tasks and leaves long tasks alone", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        longTasks: [{ url: "https://example.com/long.js", startTime: 1200, duration: 90 }],
        mainThreadTasks: [
          { startTime: 1000, duration: 20 },
          { startTime: 1020, duration: 15 },
          { startTime: 1035, duration: 10 },
          { startTime: 1500, duration: 25 },
          { startTime: 1800, duration: 12 },
          { startTime: 1808, duration: 8 },
        ],
      }),
    );

    const shorts = timeline!.events.filter((m) => m.id.startsWith("short-task-"));
    const longs = timeline!.events.filter((m) => m.id.startsWith("long-task-"));

    expect(longs).toHaveLength(1);
    expect(longs[0]?.title).toBe("Long task");
    expect(longs[0]?.kind).toBe("blocking");

    expect(shorts.map((m) => m.title)).toEqual(["3 Short tasks", "Short task", "2 Short tasks"]);
    expect(shorts.map((m) => m.kind)).toEqual([
      "potentially-blocking",
      "potentially-blocking",
      "potentially-blocking",
    ]);
    expect(shorts[0]?.detail).toMatch(/3 short tasks/);
    expect(shorts[0]?.waterfall).toHaveLength(3);
    expect(shorts[2]?.waterfall).toHaveLength(2);
  });

  it("omits redirect rows when there are no redirects", () => {
    const timeline = buildPageLoadTimeline(makeItem({ redirectsMs: 0 }));
    const steps = timeline!.events;
    expect(steps.some((s) => s.id === "nav-redirects")).toBe(false);
  });

  it("includes a redirect span when redirects took time", () => {
    const timeline = buildPageLoadTimeline(makeItem({ redirectsMs: 150 }));
    const redirects = timeline!.events.find((s) => s.id === "nav-redirects");
    expect(redirects?.startMs).toBe(0);
    expect(redirects?.timeMs).toBe(150);
    expect(redirects?.endMs).toBe(150);
    expect(redirects?.kind).toBe("blocking");
  });

  it("sizes redirects from the redirect response, not the lab savings estimate", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        formFactor: "mobile",
        serverResponseMs: 94,
        redirectsMs: 2390,
        metrics: {
          timeToFirstByte: 601,
          firstContentfulPaint: 2819,
          largestContentfulPaint: 6976,
          observedFirstContentfulPaint: 1200,
          observedLargestContentfulPaint: 1200,
        },
        networkRequests: [
          {
            url: "https://www.nextjs.org/",
            networkRequestTime: 2,
            networkEndTime: 80,
            transferSize: 375,
            statusCode: 307,
            protocol: "http/1.1",
          },
          {
            url: "https://nextjs.org/",
            resourceType: "Document",
            mimeType: "text/html",
            networkRequestTime: 90,
            networkEndTime: 320,
            transferSize: 70000,
            statusCode: 200,
            protocol: "h2",
          },
        ],
      }),
    );

    const redirects = timeline!.events.find((s) => s.id === "nav-redirects");
    const redirectBar = networkBars(timeline!).find((bar) => bar.statusCode === 307);
    const documentBar = networkBars(timeline!).find((bar) => bar.statusCode === 200);

    expect(redirects?.startMs).toBe(redirectBar?.startMs);
    expect(redirects?.timeMs).toBe(redirectBar?.endMs);
    expect(redirects?.endMs).toBe(redirectBar?.endMs);
    expect(redirects!.endMs! - redirects!.startMs!).toBeLessThan(1000);
    expect(redirects?.detail).not.toMatch(/2\.39 s/);
    expect(redirects?.waterfall?.map((bar) => bar.href)).toEqual(["https://www.nextjs.org/"]);
    expect(redirects?.table?.rows[0]?.map((cell) => cell.text)).toContain("status 307");
    expect(
      timeline!.events.some(
        (moment) => moment.id.startsWith("net-") && moment.detail.includes("307"),
      ),
    ).toBe(false);
    expect(
      timeline!.events.some(
        (moment) => moment.id.startsWith("net-") && moment.detail.includes("nextjs.org/"),
      ),
    ).toBe(true);
    expect(redirectBar!.endMs).toBeLessThan(601);
    expect(documentBar!.endMs).toBeGreaterThanOrEqual(601);
    expect(milestone(timeline!, "m-ttfb")?.timeMs).toBe(601);
  });

  it("nests a redirect chain on one row and leaves later redirects alone", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        redirectsMs: 120,
        networkRequests: [
          {
            url: "http://example.com/",
            networkRequestTime: 1,
            networkEndTime: 40,
            transferSize: 200,
            statusCode: 301,
            protocol: "http/1.1",
          },
          {
            url: "https://example.com/",
            networkRequestTime: 50,
            networkEndTime: 120,
            transferSize: 300,
            statusCode: 307,
            protocol: "h2",
          },
          {
            url: "https://www.example.com/",
            resourceType: "Document",
            mimeType: "text/html",
            networkRequestTime: 130,
            networkEndTime: 250,
            transferSize: 1000,
            statusCode: 200,
          },
          {
            url: "https://cdn.example.com/old.png",
            resourceType: "Image",
            networkRequestTime: 400,
            networkEndTime: 500,
            transferSize: 100,
            statusCode: 301,
          },
        ],
      }),
    );

    const redirects = timeline!.events.find((moment) => moment.id === "nav-redirects");
    expect(redirects?.waterfall?.map((bar) => bar.href)).toEqual([
      "http://example.com/",
      "https://example.com/",
    ]);
    expect(redirects?.startMs).toBe(1);
    expect(redirects?.timeMs).toBe(120);
    expect(redirects?.endMs).toBe(120);
    expect(timeline!.events.filter((moment) => moment.id === "nav-redirects")).toHaveLength(1);
    expect(
      timeline!.events.filter((moment) => moment.id.startsWith("net-")).map((moment) => moment.title),
    ).toEqual(["Document", "Image"]);
  });

  it("adds every filmstrip frame as its own timeline moment", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        filmstrip: [
          { timing: 1500, data: "late-frame" },
          { timing: 2800, data: "later" },
        ],
        metrics: {
          observedFirstPaint: 200,
          observedFirstContentfulPaint: 1600,
          observedLargestContentfulPaint: 2700,
        },
      }),
    );

    const fcpStep = timeline!.events.find((s) => s.id === "render-fcp");
    expect(fcpStep?.detail).toBe("First Contentful Paint at 1.60 s.");
    expect(timeline!.events.find((s) => s.id === "render-fp")?.timeMs).toBe(200);

    const shots = timeline!.events.filter((m) => m.id.startsWith("screenshot-"));
    expect(shots.map((m) => ({ timeMs: m.timeMs, data: m.screenshot?.data }))).toEqual([
      { timeMs: 1500, data: "late-frame" },
      { timeMs: 2800, data: "later" },
    ]);
    expect(timeline!.events.find((m) => m.id === "render-fcp")?.screenshot).toBeUndefined();
    expect(timeline!.events.filter((m) => m.id.startsWith("screenshot-"))).toHaveLength(2);
  });

  it("keeps LCP subpart breakdown without findings", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        lcpNodeLabel: "Hero banner",
        lcpSubparts: [
          { subpart: "timeToFirstByte", label: "Time to first byte", duration: 50 },
          { subpart: "elementRenderDelay", label: "Element render delay", duration: 2100 },
        ],
        metrics: { observedLargestContentfulPaint: 2276 },
      }),
    );

    expect(lcpSegments(timeline!)).toHaveLength(2);
    const lcp = timeline!.events.find((m) => m.id === "sub-lcp");
    expect(lcp?.detail).toMatch(/Hero banner/);
    expect(lcp?.detail).toMatch(/Element render delay/);
    expect(lcp?.lcpSegments?.[1]?.subpart).toBe("elementRenderDelay");
  });

  it("builds chronological moments starting at 0 ms", () => {
    const timeline = buildPageLoadTimeline(makeItem({}));
    expect(timeline!.events.length).toBeGreaterThan(5);
    expect(timeline!.events[0]?.timeMs).toBe(0);
    expect(timeline!.events[0]?.title).toBe("Navigation start");

    for (let i = 1; i < timeline!.events.length; i++) {
      expect(timeline!.events[i]!.timeMs).toBeGreaterThanOrEqual(timeline!.events[i - 1]!.timeMs);
    }

    const shots = timeline!.events.filter((m) => m.id.startsWith("screenshot-"));
    expect(shots.map((m) => m.screenshot?.data)).toEqual(["img-early", "img-fcp", "img-lcp"]);
    expect(shots.map((m) => m.timeMs)).toEqual([800, 1300, 2600]);
    expect(timeline!.events.find((m) => m.id === "render-fcp")).toBeDefined();
  });

  it("shows the same simulated first byte on the document and a text LCP breakdown", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        formFactor: "mobile",
        serverResponseMs: 94,
        lcpNodeLabel: "Used by the world's largest companies",
        metrics: {
          timeToFirstByte: 601,
          firstContentfulPaint: 2270,
          largestContentfulPaint: 6980,
          observedFirstContentfulPaint: 2481,
          observedLargestContentfulPaint: 2481,
        },
        lcpSubparts: [
          { subpart: "timeToFirstByte", label: "Time to first byte", duration: 72 },
          { subpart: "elementRenderDelay", label: "Element render delay", duration: 6900 },
        ],
      }),
    );

    const firstByte = lcpSegments(timeline!).find((seg) => seg.subpart === "timeToFirstByte");
    const render = lcpSegments(timeline!).find((seg) => seg.subpart === "elementRenderDelay");
    expect(milestone(timeline!, "m-ttfb")?.timeMs).toBe(601);
    expect(findMarked(timeline!, "req-ttfb")?.detail).toMatch(/First byte at 601 ms/);
    expect(firstByte?.durationMs).toBe(601);
    expect(render?.durationMs).toBeCloseTo(6980 - 601, 5);
    expect(lcpSegments(timeline!).reduce((sum, seg) => sum + seg.durationMs, 0)).toBeCloseTo(6980, 5);
  });

  it("places long-task rows between FCP and LCP under simulation", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        formFactor: "mobile",
        serverResponseMs: 94,
        metrics: {
          timeToFirstByte: 601,
          firstContentfulPaint: 2270,
          largestContentfulPaint: 6980,
          observedFirstContentfulPaint: 2481,
          observedLargestContentfulPaint: 2481,
          lcpLoadDelay: 0,
          lcpLoadDuration: 0,
        },
        longTasks: [
          { url: "https://example.com/app.js", startTime: 2600, duration: 200 },
          { url: "https://example.com/late.js", startTime: 9000, duration: 100 },
        ],
        lcpSubparts: [
          { subpart: "timeToFirstByte", label: "Time to first byte", duration: 72 },
          { subpart: "elementRenderDelay", label: "Element render delay", duration: 6900 },
        ],
      }),
    );

    const moments = timeline!.events;
    const fcpIdx = moments.findIndex((m) => m.id === "render-fcp");
    const lcpIdx = moments.findIndex((m) => m.id === "sub-lcp");
    expect(fcpIdx).toBeGreaterThanOrEqual(0);
    expect(lcpIdx).toBeGreaterThan(fcpIdx);

    const between = moments.slice(fcpIdx + 1, lcpIdx);
    expect(moments.some((m) => m.id === "lcp-seg-elementRenderDelay")).toBe(false);
    const tasks = moments.filter((moment) => moment.id.startsWith("long-task-"));
    expect(tasks.map((moment) => moment.startMs)).toEqual([2600, 9000]);
    expect(tasks.map((moment) => moment.timeMs)).toEqual([2800, 9100]);
    expect(between.some((moment) => moment.id.startsWith("long-task-"))).toBe(true);
    expect(moments.some((moment) => moment.id.startsWith("long-task-") && moment.timeMs > 6980)).toBe(
      true,
    );
  });

  it("places mobile TTFB on the observed trace instead of the throttled lab score", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        metrics: { timeToFirstByte: 601 },
        serverResponseMs: 94,
        networkRequests: [
          {
            url: "https://www.example.com/",
            resourceType: "Document",
            networkRequestTime: 0.894,
            networkEndTime: 321,
            transferSize: 70000,
            statusCode: 200,
            protocol: "h2",
            mimeType: "text/html",
          },
        ],
      }),
    );

    const ttfb = milestone(timeline!, "m-ttfb");
    expect(ttfb?.timeMs).toBeCloseTo(94.894, 3);
    expect(ttfb?.rating).toBe("good");

    const step = findMarked(timeline!, "req-ttfb");
    expect(step?.timeMs).toBeCloseTo(94.894, 3);
    expect(step?.detail).toMatch(/Observed first byte at 95 ms/);
    expect(step?.detail).toMatch(/lab score \(601 ms\)/);
    expect(step?.detail).toMatch(/simulated throttling/i);
  });

  it("prefers observedTimeToFirstByte when the metrics audit includes it", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        metrics: { timeToFirstByte: 601, observedTimeToFirstByte: 120 },
        serverResponseMs: 94,
      }),
    );

    expect(milestone(timeline!, "m-ttfb")?.timeMs).toBe(120);
  });

  it("keeps the lab TTFB when the trace has no server response time", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        metrics: { timeToFirstByte: 180 },
        serverResponseMs: null,
      }),
    );

    const step = findMarked(timeline!, "req-ttfb");
    expect(step?.timeMs).toBe(180);
    expect(step?.detail).toBe("First byte at 180 ms.");
    expect(timeline!.events.some((moment) => moment.id === "req-server")).toBe(false);
  });

  it("drops a simulated TTFB that lands after the HTML response", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        metrics: { timeToFirstByte: 601 },
        serverResponseMs: null,
        networkRequests: [
          {
            url: "https://example.com/",
            resourceType: "Document",
            networkRequestTime: 1,
            networkEndTime: 321,
            mimeType: "text/html",
          },
        ],
      }),
    );

    expect(milestone(timeline!, "m-ttfb")).toBeUndefined();
    expect(findMarked(timeline!, "req-ttfb")).toBeUndefined();
  });

  it("omits field INP from the lab timeline", () => {
    const timeline = buildPageLoadTimeline(makeItem({}));
    const steps = timeline!.events;
    expect(steps.every((s) => s.id !== "after-field-inp")).toBe(true);
    expect(timeline!.events.every((m) => m.title !== "Field INP")).toBe(true);
  });

  it("adds First Paint, first visual change, and TTFB as top-level moments", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        metrics: {
          observedFirstPaint: 1100,
          observedFirstVisualChange: 1050,
          observedFirstContentfulPaint: 1200,
          timeToFirstByte: 200,
        },
        serverResponseMs: 90,
      }),
    );

    const firstVisual = timeline!.events.find((m) => m.id === "render-first-visual");
    expect(firstVisual).toMatchObject({
      title: "First visual change",
      timeMs: 1050,
      detail: "First visual change at 1.05 s.",
    });

    const firstPaint = timeline!.events.find((m) => m.id === "render-fp");
    expect(firstPaint).toMatchObject({
      title: "First Paint",
      timeMs: 1100,
      detail: "First Paint at 1.10 s.",
    });

    const fcp = timeline!.events.find((m) => m.id === "render-fcp");
    expect(fcp?.detail).toBe("First Contentful Paint at 1.20 s.");
    expect(fcp?.detail).not.toMatch(/First Paint was/i);

    const ttfb = timeline!.events.find((m) => m.id === "req-ttfb");
    expect(ttfb).toMatchObject({
      title: "TTFB",
      timeMs: 95,
      kind: "marker",
    });
    expect(ttfb?.detail).toMatch(/Observed first byte at 95 ms/);
    expect(
      timeline!.events
        .find((m) => m.title === "Document")
        ?.notes?.some((note) => note.id === "req-ttfb"),
    ).toBeFalsy();
  });

  it("plots layout shifts that include a startTime", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        layoutShifts: [
          {
            startTime: 1800,
            score: 0.12,
            node: { type: "node", nodeLabel: "Hero banner" },
          },
          {
            score: 0.05,
            node: { type: "node", nodeLabel: "Missing time" },
          },
          {
            startTime: 900,
            score: 0.00002,
            node: { type: "node", nodeLabel: "Cookie banner" },
          },
        ],
      }),
    );

    const shifts = timeline!.events.filter((m) => m.id.startsWith("layout-shift-"));
    expect(shifts.map((m) => ({ id: m.id, timeMs: m.timeMs, title: m.title }))).toEqual([
      { id: "layout-shift-0", timeMs: 900, title: "Layout shift" },
      { id: "layout-shift-1", timeMs: 1800, title: "Layout shift" },
    ]);
    expect(shifts[0]?.detail).toMatch(/Cookie banner/);
    expect(shifts[0]?.detail).toMatch(/0\.000020|2\.0e-5|0\.00002/i);
    expect(shifts[1]?.detail).toMatch(/0\.120/);
    expect(shifts[1]?.evidence).toEqual(["Element: Hero banner"]);
    expect(shifts.every((m) => m.kind === "marker")).toBe(true);
  });

  it("skips layout-shift rows without a startTime", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        layoutShifts: [
          {
            score: 0.08,
            node: { type: "node", nodeLabel: "No timestamp in PSI" },
          },
        ],
      }),
    );

    expect(timeline!.events.some((m) => m.id.startsWith("layout-shift-"))).toBe(false);
  });

  it("builds timelines for multiple reports and skips empty ones", () => {
    const result = buildPageLoadTimelines([
      makeItem({ label: "Mobile" }),
      {
        label: "Broken",
        item: {} as InsightsContextItem["item"],
      },
      makeItem({ label: "Desktop", metrics: { timeToFirstByte: 100 } }),
    ]);
    expect(result.map((t) => t.label)).toEqual(["Mobile", "Desktop"]);
  });

  it("moves timeline numbers onto simulated CPU and network throttling", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        formFactor: "mobile",
        serverResponseMs: 94,
        metrics: {
          timeToFirstByte: 601,
          firstContentfulPaint: 2819,
          largestContentfulPaint: 19463,
          observedFirstContentfulPaint: 2481,
          observedLargestContentfulPaint: 2481,
          observedLoad: 1073,
          observedTraceEnd: 8754,
          lcpLoadDelay: 2825,
          lcpLoadDuration: 2915,
          interactive: 23882,
          totalBlockingTime: 1328,
        },
        networkRequests: [
          {
            url: "https://www.example.com/",
            resourceType: "Document",
            networkRequestTime: 0.894,
            networkEndTime: 321,
            transferSize: 70973,
            statusCode: 200,
            protocol: "h2",
            mimeType: "text/html",
          },
          {
            url: "https://www.example.com/app.css",
            resourceType: "Stylesheet",
            networkRequestTime: 345,
            networkEndTime: 371,
            transferSize: 1_000_000,
            statusCode: 200,
            protocol: "h2",
          },
        ],
        longTasks: [{ url: "https://www.example.com/app.js", startTime: 8000, duration: 180 }],
        mainThreadTasks: [{ startTime: 3000, duration: 100 }],
        lcpSubparts: [
          { subpart: "timeToFirstByte", label: "Time to first byte", duration: 0.016 },
          { subpart: "resourceLoadDelay", label: "Resource load delay", duration: 345 },
          { subpart: "resourceLoadDuration", label: "Resource load duration", duration: 26 },
          { subpart: "elementRenderDelay", label: "Element render delay", duration: 2109 },
        ],
      }),
    );

    expect(timeline!.simulationLabel).toBe("Slow 4G, 4× CPU");
    expect(milestone(timeline!, "m-ttfb")?.timeMs).toBe(601);
    expect(milestone(timeline!, "m-fcp")?.timeMs).toBe(2819);
    expect(milestone(timeline!, "m-lcp")?.timeMs).toBe(19463);
    expect(milestone(timeline!, "m-lcp")?.rating).toBe("poor");

    const ttfb = findMarked(timeline!, "req-ttfb");
    expect(ttfb?.detail).toMatch(/601 ms/);
    expect(ttfb?.detail).toMatch(/Slow 4G, 4× CPU/);

    const css = networkBars(timeline!).find((bar) => bar.url.includes("app.css"));
    expect(css!.endMs - css!.startMs).toBeGreaterThan(371 - 345);

    const attributed = mainThreadBlocks(timeline!).find((block) => block.url?.includes("app.js"));
    expect(attributed).toMatchObject({ startMs: 8000, durationMs: 180 });

    const observed = mainThreadBlocks(timeline!).find((block) => !block.url);
    expect(observed?.durationMs).toBe(400);
    // Post-paint observed work that fits in the CPU budget lands in the FCP→LCP gap.
    expect(observed!.startMs).toBeGreaterThan(2819);
    expect(observed!.startMs).toBeLessThan(19463);

    const renderDelay = lcpSegments(timeline!).find((seg) => seg.subpart === "elementRenderDelay");
    expect(renderDelay?.durationMs).toBeCloseTo(19463 - 601 - 2825 - 2915, 3);

    expect(milestone(timeline!, "m-load")?.timeMs).toBeGreaterThan(1073);
    const tti = timeline!.events.find((s) => s.id === "after-tti");
    expect(tti?.timeMs).toBe(23882);
  });

  it("leaves the observed trace alone when throttling was already applied", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        formFactor: "mobile",
        throttlingMethod: "provided",
        metrics: {
          timeToFirstByte: 601,
          firstContentfulPaint: 2819,
          largestContentfulPaint: 19463,
          observedFirstContentfulPaint: 2481,
          observedLargestContentfulPaint: 2481,
        },
      }),
    );

    expect(timeline!.simulationLabel).toBeUndefined();
    expect(milestone(timeline!, "m-fcp")?.timeMs).toBe(2481);
    expect(milestone(timeline!, "m-lcp")?.timeMs).toBe(2481);
    expect(mainThreadBlocks(timeline!)[0]?.durationMs).toBe(300);
  });

  it("keeps Lantern long-task times and scales observed main-thread tasks once", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        formFactor: "mobile",
        serverResponseMs: 11,
        metrics: {
          timeToFirstByte: 601,
          firstContentfulPaint: 2281,
          largestContentfulPaint: 3181,
          observedFirstContentfulPaint: 753,
          observedLargestContentfulPaint: 753,
          observedTraceEnd: 4301,
        },
        longTasks: [
          {
            url: "https://nextjs.org/_next/static/immutable/chunks/1k7fgn7k76n8n.js",
            startTime: 3645,
            duration: 61,
          },
          {
            url: "https://nextjs.org/_next/static/immutable/chunks/1k7fgn7k76n8n.js",
            startTime: 5733,
            duration: 170,
          },
        ],
        mainThreadTasks: [{ startTime: 921.7, duration: 50.6 }],
      }),
    );

    const script = "https://nextjs.org/_next/static/immutable/chunks/1k7fgn7k76n8n.js";
    const attributed = mainThreadBlocks(timeline!).filter((block) => block.url === script);
    expect(attributed.map((block) => [block.startMs, block.durationMs])).toEqual([
      [3645, 61],
      [5733, 170],
    ]);

    const card = timeline!.events.find((moment) => moment.startMs === 3645);
    expect(card?.detail).toBe(
      "nextjs.org/_next/static/immutable/chunks/1k7fgn… blocked the main thread for 61 ms.",
    );
    expect(card?.timeMs).toBe(3706);
    expect(card?.endMs).toBe(3706);

    const observed = mainThreadBlocks(timeline!).filter((block) => !block.url);
    expect(observed).toHaveLength(1);
    expect(observed[0]?.durationMs).toBeCloseTo(202.4, 5);
    expect(timeline!.events.some((moment) => moment.timeMs > 20000)).toBe(false);
  });

  it("drops an observed main-thread task that repeats a Lantern long task", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        formFactor: "desktop",
        longTasks: [{ url: "https://example.com/app.js", startTime: 900, duration: 105 }],
        mainThreadTasks: [
          { startTime: 832.6, duration: 105.1 },
          { startTime: 1094, duration: 325.6 },
        ],
      }),
    );

    expect(mainThreadBlocks(timeline!).map((block) => block.durationMs)).toEqual([105, 325.6]);
    expect(mainThreadBlocks(timeline!)[0]).toMatchObject({
      startMs: 900,
      url: "https://example.com/app.js",
    });
  });

  it("places each long task on the timeline at the moment it ends", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        longTasks: [
          { url: "https://nextjs.org/_next/static/chunks/app.js", startTime: 17100, duration: 848 },
          { startTime: 9880, duration: 580 },
          {
            url: "https://nextjs.org/_next/static/chunks/vendor.js",
            startTime: 4200,
            duration: 90,
          },
        ],
      }),
    );

    const moments = timeline!.events.filter((item) => item.id.startsWith("long-task-"));
    expect(moments.map((moment) => moment.startMs)).toEqual([4200, 9880, 17100]);
    expect(moments.map((moment) => moment.timeMs)).toEqual([4290, 10460, 17948]);
    expect(moments.map((moment) => moment.endMs)).toEqual([4290, 10460, 17948]);
    expect(moments.map((moment) => moment.title)).toEqual(["Long task", "Long task", "Long task"]);
    expect(timeline!.events.some((item) => item.id === "after-long-tasks")).toBe(false);

    const first = moments[0];
    expect(first?.detail).toBe(
      "nextjs.org/_next/static/chunks/vendor.js blocked the main thread for 90 ms.",
    );
    expect(first?.table?.rows).toEqual([
      [
        {
          text: "nextjs.org/_next/static/chunks/vendor.js",
          href: "https://nextjs.org/_next/static/chunks/vendor.js",
        },
        { text: "4.20 s", align: "end" },
        { text: "90 ms", align: "end" },
      ],
    ]);
    expect(first?.waterfall).toHaveLength(1);

    const unattributed = moments[1];
    expect(unattributed?.detail).toBe("Unattributed script blocked the main thread for 580 ms.");
    expect(unattributed?.table?.rows).toEqual([
      [
        { text: "Unattributed", href: undefined },
        { text: "9.88 s", align: "end" },
        { text: "580 ms", align: "end" },
      ],
    ]);

    const longest = moments[2];
    expect(longest?.table?.rows[0]?.[0]).toEqual({
      text: "nextjs.org/_next/static/chunks/app.js",
      href: "https://nextjs.org/_next/static/chunks/app.js",
    });
    expect(longest?.table?.rows[0]?.[2]).toEqual({ text: "848 ms", align: "end" });
  });

  it("plots user-timing marks and measures and skips clearMarks", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        userTimings: [
          {
            name: "Next.js-before-hydration",
            timingType: "Measure",
            startTime: 0,
            duration: 1144,
          },
          {
            name: "Next.js-hydration",
            timingType: "Measure",
            startTime: 1144,
            duration: 240,
          },
          { name: "beforeRender", timingType: "Mark", startTime: 1144 },
          { name: "clearMarks", timingType: "Mark", startTime: 1387 },
          { name: "clearMarks", timingType: "Mark", startTime: 1387 },
          { name: "sentry-tracing-init", timingType: "Mark", startTime: 1434 },
        ],
      }),
    );

    const steps = timeline!.events;
    const userSteps = steps.filter((s) => s.id.startsWith("user-timing-"));
    expect(userSteps.map((s) => s.title)).toEqual([
      "Next.js-before-hydration",
      "beforeRender",
      "Next.js-hydration",
      "sentry-tracing-init",
    ]);

    const beforeHydration = userSteps.find((s) => s.title === "Next.js-before-hydration");
    // Measures sit at their end time so a 0→1.14s span isn't pinned at navigation start.
    expect(beforeHydration?.startMs).toBe(0);
    expect(beforeHydration?.timeMs).toBe(1144);
    expect(beforeHydration?.endMs).toBe(1144);
    expect(beforeHydration?.detail).toMatch(/1\.14 s/);

    const hydration = userSteps.find((s) => s.title === "Next.js-hydration");
    expect(hydration?.startMs).toBe(1144);
    expect(hydration?.timeMs).toBe(1384);
    expect(hydration?.endMs).toBe(1384);
    expect(hydration?.detail).toMatch(/240 ms/);

    const mark = userSteps.find((s) => s.title === "beforeRender");
    expect(mark?.timeMs).toBe(1144);
    expect(mark?.endMs).toBeUndefined();
    expect(steps.some((s) => s.title === "clearMarks")).toBe(false);
  });

  it("shows request priority on network waterfall rows and tables", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        networkRequests: [
          {
            url: "https://example.com/",
            resourceType: "Document",
            networkRequestTime: 5,
            networkEndTime: 250,
            transferSize: 40000,
            statusCode: 200,
            protocol: "h2",
            mimeType: "text/html",
            priority: "VeryHigh",
          },
          {
            url: "https://example.com/hero.png",
            resourceType: "Image",
            networkRequestTime: 100,
            networkEndTime: 400,
            transferSize: 80000,
            statusCode: 200,
            protocol: "h2",
            priority: "Low",
          },
        ],
      }),
    );

    const hero = timeline!.events.find((m) => m.title === "Image");
    expect(hero?.detail).toMatch(/priority Low/);
    expect(hero?.waterfall?.[0]?.priority).toBe("Low");
    expect(hero?.table?.headers.map((h) => h.text)).toContain("Priority");
    expect(hero?.table?.rows[0]?.[3]).toEqual({ text: "Low", align: "end" });
    expect(networkBars(timeline!).find((b) => b.url.includes("hero"))?.priority).toBe("Low");
  });

  it("attaches LCP discovery failures as notes on the LCP row", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        lcpNodeLabel: "Hero banner",
        discovery: {
          requestDiscoverable: true,
          priorityHinted: false,
          eagerlyLoaded: true,
        },
      }),
    );

    const lcp = timeline!.events.find((m) => m.id === "sub-lcp");
    expect(lcp?.notes).toHaveLength(1);
    expect(lcp?.notes?.[0]).toMatchObject({
      id: "lcp-discovery-priorityHinted",
      title: "LCP discovery",
      detail: "fetchpriority=high should be applied",
      kind: "blocking",
    });
    expect(lcp?.lcpElement).toMatchObject({
      type: "node",
      lhId: "lcp-node",
      nodeLabel: "Hero banner",
    });
  });

  it("surfaces preconnect candidates as a connection-phase fact", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        preconnectCandidates: [
          { origin: "https://cdn.example.com", wastedMs: 314 },
          { origin: "https://fonts.example.com", wastedMs: 200 },
        ],
      }),
    );

    expect(timeline!.events.some((e) => e.phaseId === "connection")).toBe(true);
    const preconnect = timeline!.events.find((m) => m.id === "conn-preconnect");
    expect(preconnect?.kind).toBe("fact");
    expect(preconnect?.hasTimestamp).toBe(false);
    expect(preconnect?.detail).toMatch(/2 origins/);
    expect(preconnect?.detail).toMatch(/314 ms/);
    expect(preconnect?.detail).toMatch(/no origins were preconnected/i);
    expect(preconnect?.table?.rows).toHaveLength(2);
    expect(preconnect?.evidence?.[0]).toMatch(/cdn\.example\.com/);
  });

  it("omits Speed Index because it is a score, not a load event", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        formFactor: "mobile",
        metrics: {
          timeToFirstByte: 601,
          firstContentfulPaint: 2819,
          largestContentfulPaint: 19463,
          speedIndex: 11744,
          observedSpeedIndex: 3132,
          observedFirstContentfulPaint: 2481,
          observedLargestContentfulPaint: 2481,
        },
      }),
    );

    expect(timeline!.events.some((m) => /speed index/i.test(m.title))).toBe(false);
    expect(timeline!.events.some((m) => /speed index/i.test(m.title))).toBe(false);
    const steps = timeline!.events;
    expect(steps.some((step) => step.id === "render-speed-index")).toBe(false);
  });

  it("names critical-chain duration on the network flag", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        chainUrls: ["https://cdn.example.com/tag.js"],
        networkRequests: [
          {
            url: "https://example.com/",
            resourceType: "Document",
            networkRequestTime: 5,
            networkEndTime: 250,
            transferSize: 40000,
            statusCode: 200,
            protocol: "h2",
            mimeType: "text/html",
          },
          {
            url: "https://cdn.example.com/tag.js",
            resourceType: "Script",
            networkRequestTime: 100,
            networkEndTime: 500,
            transferSize: 50000,
            statusCode: 200,
            protocol: "h2",
          },
        ],
      }),
    );

    const script = timeline!.events.find((m) => m.title === "Script downloaded");
    expect(script?.detail).toMatch(/critical chain \(800 ms\)/);
    expect(script?.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "critical-chain-js",
          title: "Avoid chaining critical requests",
          detail:
            "Reduce the length of chains, reduce the download size of resources, or defer the download of unnecessary resources to improve page load.",
        }),
      ]),
    );

    const document = timeline!.events.find((m) => m.title === "Document");
    expect(document?.notes?.some((n) => n.id === "critical-chain-js")).toBeFalsy();
  });
});
