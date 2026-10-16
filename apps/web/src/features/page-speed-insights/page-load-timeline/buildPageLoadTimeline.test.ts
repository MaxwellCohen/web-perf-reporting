import { describe, expect, it } from "vitest";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { buildPageLoadTimeline, buildPageLoadTimelines } from "./buildPageLoadTimeline";

function makeItem(overrides: {
  label?: string;
  metrics?: Record<string, unknown>;
  networkRequests?: Array<Record<string, unknown>>;
  filmstrip?: Array<{ timing: number; data: string; timestamp?: number }>;
  longTasks?: Array<{ url?: string; startTime: number; duration: number }>;
  lcpSubparts?: Array<{ subpart: string; label: string; duration: number }>;
  lcpNodeLabel?: string;
  renderBlocking?: Array<{ url: string; wastedMs?: number }>;
  serverResponseMs?: number | null;
  redirectsMs?: number;
  protocol?: string;
  rtt?: number;
  preconnectCandidates?: Array<{ origin: string; wastedMs: number }>;
  chainUrls?: string[];
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
      nodeLabel: overrides.lcpNodeLabel,
      snippet: "<div>",
    });
  }

  const discoveryChecklist = overrides.discovery
    ? {
        type: "checklist",
        items: {
          requestDiscoverable: {
            label: "discoverable",
            value: overrides.discovery.requestDiscoverable ?? true,
          },
          priorityHinted: {
            label: "priority",
            value: overrides.discovery.priorityHinted ?? true,
          },
          eagerlyLoaded: {
            label: "eager",
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
          navStartToEndTime: 100 * (i + 1),
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
      details: { type: "table", items: [], headings: [] },
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
    const fcp = timeline!.milestones.find((m) => m.id === "m-fcp");
    const lcp = timeline!.milestones.find((m) => m.id === "m-lcp");
    const dcl = timeline!.milestones.find((m) => m.id === "m-dcl");
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

    const ttfb = timeline!.milestones.find((m) => m.id === "m-ttfb");
    const fcp = timeline!.milestones.find((m) => m.id === "m-fcp");
    expect(ttfb?.timeMs).toBe(955);
    expect(ttfb?.rating).toBe("needs-improvement");
    expect(fcp?.rating).toBe("poor");
    expect(timeline!.findings).toEqual([]);
  });

  it("emits only timed milestones, network rows, and long tasks", () => {
    const timeline = buildPageLoadTimeline(makeItem({}));
    expect(timeline).not.toBeNull();

    const steps = timeline!.phases.flatMap((p) => p.steps);
    expect(steps.every((s) => s.status === "measured")).toBe(true);
    expect(steps.every((s) => s.timeMs != null)).toBe(true);
    expect(steps.some((s) => s.status === "not-recorded")).toBe(false);
    expect(steps.some((s) => s.status === "inferred")).toBe(false);

    expect(steps.some((s) => s.id === "nav-start")).toBe(true);
    expect(steps.some((s) => s.id === "req-ttfb")).toBe(true);
    expect(steps.some((s) => s.id === "render-fcp")).toBe(true);
    expect(steps.some((s) => s.id === "sub-lcp")).toBe(true);
    expect(steps.some((s) => s.id.startsWith("net-"))).toBe(true);

    expect(steps.some((s) => s.id === "conn-dns")).toBe(false);
    expect(steps.some((s) => s.id === "nav-beforeunload")).toBe(false);
    expect(steps.some((s) => s.id === "req-preload-scanner")).toBe(false);
    expect(steps.some((s) => s.id === "head-css")).toBe(false);
    expect(timeline!.findings).toEqual([]);
    expect(timeline!.phases.some((p) => p.id === "connection")).toBe(false);
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

    const netMoments = timeline!.moments.filter((m) => m.id.startsWith("net-"));
    expect(netMoments).toHaveLength(3);
    expect(netMoments.map((m) => m.title)).toEqual(["Document", "Stylesheet", "Script"]);

    const doc = netMoments[0];
    expect(doc?.timeMs).toBe(5);
    expect(doc?.endMs).toBe(250);
    expect(doc?.detail).toMatch(/document/);
    expect(doc?.table?.rows[0]?.[0]).toMatchObject({
      text: "example.com/",
      href: "https://example.com/",
    });

    const css = netMoments.find((m) => m.title === "Stylesheet");
    expect(css?.kind).toBe("blocking");
    expect(css?.detail).toMatch(/render-blocking/);
  });

  it("groups same-type network requests that start within 10 ms", () => {
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
            url: "https://example.com/late.js",
            resourceType: "Script",
            networkRequestTime: 400,
            networkEndTime: 600,
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
        ],
      }),
    );

    const netMoments = timeline!.moments.filter((m) => m.id.startsWith("net-"));
    const scriptsBurst = netMoments.find((m) => m.title === "3 Scripts");
    expect(scriptsBurst?.timeMs).toBe(200);
    expect(scriptsBurst?.endMs).toBe(500);
    expect(scriptsBurst?.detail).toMatch(/within 10 ms/);
    expect(scriptsBurst?.table?.rows).toHaveLength(3);

    expect(netMoments.some((m) => m.title === "Script" && m.timeMs === 400)).toBe(true);
    expect(netMoments.some((m) => m.title === "Stylesheet" && m.timeMs === 201)).toBe(true);
  });

  it("groups long tasks that start within 10 ms", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        longTasks: [
          { url: "https://example.com/a.js", startTime: 1000, duration: 80 },
          { url: "https://example.com/b.js", startTime: 1005, duration: 60 },
          { startTime: 2000, duration: 100 },
        ],
      }),
    );

    const longTasks = timeline!.moments.filter((m) => m.id.startsWith("long-task-"));
    expect(longTasks.map((m) => m.title)).toEqual(["2 Long tasks", "Long task"]);
    expect(longTasks[0]?.table?.rows).toHaveLength(2);
    expect(longTasks[0]?.detail).toMatch(/within 10 ms/);
  });

  it("omits redirect rows when there are no redirects", () => {
    const timeline = buildPageLoadTimeline(makeItem({ redirectsMs: 0 }));
    const steps = timeline!.phases.flatMap((p) => p.steps);
    expect(steps.some((s) => s.id === "nav-redirects")).toBe(false);
  });

  it("includes a redirect span when redirects took time", () => {
    const timeline = buildPageLoadTimeline(makeItem({ redirectsMs: 150 }));
    const redirects = timeline!.phases.flatMap((p) => p.steps).find((s) => s.id === "nav-redirects");
    expect(redirects?.timeMs).toBe(0);
    expect(redirects?.endMs).toBe(150);
    expect(redirects?.kind).toBe("blocking");
  });

  it("attaches a filmstrip screenshot on FCP moments", () => {
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

    const fcpStep = timeline!.phases.flatMap((p) => p.steps).find((s) => s.id === "render-fcp");
    expect(fcpStep?.detail).toMatch(/First Paint was/i);

    const fcp = timeline!.moments.find((m) => m.id === "render-fcp");
    // First filmstrip frame at or after FCP (1600 ms) is the 2800 ms frame.
    expect(fcp?.screenshot?.data).toBe("later");
    expect(timeline!.screenshots).toHaveLength(2);
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

    expect(timeline!.findings).toEqual([]);
    expect(timeline!.lcpSegments).toHaveLength(2);
    const lcp = timeline!.moments.find((m) => m.id === "sub-lcp");
    expect(lcp?.detail).toMatch(/Hero banner/);
    expect(lcp?.detail).toMatch(/Element render delay/);
    expect(lcp?.lcpSegments?.[1]?.subpart).toBe("elementRenderDelay");
  });

  it("builds chronological moments starting at 0 ms", () => {
    const timeline = buildPageLoadTimeline(makeItem({}));
    expect(timeline!.moments.length).toBeGreaterThan(5);
    expect(timeline!.moments[0]?.timeMs).toBe(0);
    expect(timeline!.moments[0]?.title).toMatch(/navigationStart/i);

    for (let i = 1; i < timeline!.moments.length; i++) {
      expect(timeline!.moments[i]!.timeMs).toBeGreaterThanOrEqual(timeline!.moments[i - 1]!.timeMs);
    }

    const fcp = timeline!.moments.find((m) => m.id === "render-fcp");
    expect(fcp?.screenshot).toBeDefined();
    expect(fcp?.network).toEqual([]);
    expect(fcp?.findings).toEqual([]);
  });

  it("places LCP subpart and long-task rows between FCP and LCP under simulation", () => {
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

    const moments = timeline!.moments;
    const fcpIdx = moments.findIndex((m) => m.id === "render-fcp");
    const lcpIdx = moments.findIndex((m) => m.id === "sub-lcp");
    expect(fcpIdx).toBeGreaterThanOrEqual(0);
    expect(lcpIdx).toBeGreaterThan(fcpIdx);

    const between = moments.slice(fcpIdx + 1, lcpIdx);
    expect(between.some((m) => m.id === "lcp-seg-elementRenderDelay")).toBe(true);
    expect(between.some((m) => m.id.startsWith("long-task-"))).toBe(true);
    expect(moments.some((m) => m.id.startsWith("long-task-") && m.timeMs > 6980)).toBe(true);
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

    const ttfb = timeline!.milestones.find((m) => m.id === "m-ttfb");
    expect(ttfb?.timeMs).toBeCloseTo(94.894, 3);
    expect(ttfb?.rating).toBe("good");

    const step = timeline!.phases.flatMap((p) => p.steps).find((s) => s.id === "req-ttfb");
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

    expect(timeline!.milestones.find((m) => m.id === "m-ttfb")?.timeMs).toBe(120);
  });

  it("keeps the lab TTFB when the trace has no server response time", () => {
    const timeline = buildPageLoadTimeline(
      makeItem({
        metrics: { timeToFirstByte: 180 },
        serverResponseMs: null,
      }),
    );

    const step = timeline!.phases.flatMap((p) => p.steps).find((s) => s.id === "req-ttfb");
    expect(step?.timeMs).toBe(180);
    expect(step?.detail).toBe("First byte at 180 ms.");
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

    expect(timeline!.milestones.find((m) => m.id === "m-ttfb")).toBeUndefined();
    expect(timeline!.phases.flatMap((p) => p.steps).some((s) => s.id === "req-ttfb")).toBe(false);
  });

  it("omits field INP from the lab timeline", () => {
    const timeline = buildPageLoadTimeline(makeItem({}));
    const steps = timeline!.phases.flatMap((p) => p.steps);
    expect(steps.every((s) => s.id !== "after-field-inp")).toBe(true);
    expect(timeline!.moments.every((m) => m.title !== "Field INP")).toBe(true);
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
        longTasks: [{ url: "https://www.example.com/app.js", startTime: 3000, duration: 100 }],
        lcpSubparts: [
          { subpart: "timeToFirstByte", label: "Time to first byte", duration: 0.016 },
          { subpart: "resourceLoadDelay", label: "Resource load delay", duration: 345 },
          { subpart: "resourceLoadDuration", label: "Resource load duration", duration: 26 },
          { subpart: "elementRenderDelay", label: "Element render delay", duration: 2109 },
        ],
      }),
    );

    expect(timeline!.simulationLabel).toBe("Slow 4G, 4× CPU");
    expect(timeline!.milestones.find((m) => m.id === "m-ttfb")?.timeMs).toBe(601);
    expect(timeline!.milestones.find((m) => m.id === "m-fcp")?.timeMs).toBe(2819);
    expect(timeline!.milestones.find((m) => m.id === "m-lcp")?.timeMs).toBe(19463);
    expect(timeline!.milestones.find((m) => m.id === "m-lcp")?.rating).toBe("poor");

    const ttfb = timeline!.phases.flatMap((p) => p.steps).find((s) => s.id === "req-ttfb");
    expect(ttfb?.detail).toMatch(/601 ms/);
    expect(ttfb?.detail).toMatch(/Slow 4G, 4× CPU/);

    const css = timeline!.networkBars.find((bar) => bar.url.includes("app.css"));
    expect(css!.endMs - css!.startMs).toBeGreaterThan(371 - 345);

    const task = timeline!.mainThreadBlocks[0];
    expect(task?.durationMs).toBe(400);
    // Post-paint observed work that fits in the CPU budget lands in the FCP→LCP gap.
    expect(task!.startMs).toBeGreaterThan(2819);
    expect(task!.startMs).toBeLessThan(19463);

    const renderDelay = timeline!.lcpSegments.find((seg) => seg.subpart === "elementRenderDelay");
    expect(renderDelay?.durationMs).toBeCloseTo(19463 - 601 - 2825 - 2915, 3);

    expect(timeline!.milestones.find((m) => m.id === "m-load")?.timeMs).toBeGreaterThan(1073);
    const tti = timeline!.phases.flatMap((p) => p.steps).find((s) => s.id === "after-tti");
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
    expect(timeline!.milestones.find((m) => m.id === "m-fcp")?.timeMs).toBe(2481);
    expect(timeline!.milestones.find((m) => m.id === "m-lcp")?.timeMs).toBe(2481);
    expect(timeline!.mainThreadBlocks[0]?.durationMs).toBe(300);
  });

  it("places each long task on the timeline at the moment it starts", () => {
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

    const moments = timeline!.moments.filter((item) => item.id.startsWith("long-task-"));
    expect(moments.map((moment) => moment.timeMs)).toEqual([4200, 9880, 17100]);
    expect(moments.map((moment) => moment.endMs)).toEqual([4290, 10460, 17948]);
    expect(moments.map((moment) => moment.title)).toEqual(["Long task", "Long task", "Long task"]);
    expect(timeline!.moments.some((item) => item.id === "after-long-tasks")).toBe(false);

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
    expect(unattributed?.detail).toBe(
      "Unattributed script blocked the main thread for 580 ms.",
    );
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

});
