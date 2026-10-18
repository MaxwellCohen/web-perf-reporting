import { describe, expect, it } from "vitest";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { buildPageLoadTimeline, buildPageLoadTimelines } from "./buildPageLoadTimeline";
import type { PageLoadTimeline } from "./types";

function findMarked(timeline: PageLoadTimeline, id: string) {
  for (const step of timeline.phases.flatMap((phase) => phase.steps)) {
    if (step.id === id) return step;
    const note = step.notes?.find((item) => item.id === id);
    if (note) return note;
  }
  return undefined;
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
    expect(findMarked(timeline!, "req-ttfb")).toBeDefined();
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

    const docNotes = doc?.notes?.map((note) => note.title);
    expect(docNotes).toEqual(["Server think time", "TTFB"]);
    expect(timeline!.moments.some((moment) => moment.id === "req-ttfb")).toBe(false);
    expect(css?.waterfall?.[0]?.renderBlocking).toBe("blocking");
    expect(netMoments.find((m) => m.title === "Script")?.waterfall?.[0]?.renderBlocking).toBe(
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

    const css = timeline!.moments.find((m) => m.title === "Stylesheet");
    expect(css?.detail).toMatch(/25% used · 2\.0 KiB used of 7\.8 KiB · 5\.9 KiB unused/);
    expect(css?.waterfall?.[0]?.coverage).toBe(
      "25% used · 2.0 KiB used of 7.8 KiB · 5.9 KiB unused",
    );

    const partial = timeline!.moments.find(
      (m) => m.title === "Script" && m.detail.includes("tag.js"),
    );
    expect(partial?.detail).toMatch(/50% used · 24\.4 KiB used of 48\.8 KiB · 24\.4 KiB unused/);
    expect(partial?.waterfall?.[0]?.coverage).toBe(
      "50% used · 24.4 KiB used of 48.8 KiB · 24.4 KiB unused",
    );

    const used = timeline!.moments.find(
      (m) => m.title === "Script" && m.detail.includes("used.js"),
    );
    expect(used?.waterfall?.[0]?.coverage).toBe("100% used · 4.0 KiB");

    const font = timeline!.moments.find((m) => m.title === "Font");
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

    const burst = timeline!.moments.find((m) => m.title === "2 Scripts");
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

    const netMoments = timeline!.moments.filter((m) => m.id.startsWith("net-"));
    expect(netMoments.map((m) => m.title)).toEqual([
      "Document",
      "Script",
      "Stylesheet",
      "2 Scripts",
      "6 Images",
      "Script",
      "Image",
    ]);

    const images = netMoments.find((m) => m.title === "6 Images");
    expect(images?.timeMs).toBe(2040);
    expect(images?.endMs).toBe(2390);
    expect(images?.detail).toMatch(/6 image requests/);
    expect(images?.detail).not.toMatch(/within 10 ms/);
    expect(images?.waterfall?.every((bar) => bar.renderBlocking === "non-blocking")).toBe(true);

    const earlyScript = netMoments.find((m) => m.title === "Script" && m.timeMs === 200);
    expect(earlyScript?.waterfall?.[0]?.label).toMatch(/a\.js/);

    const styles = netMoments.find((m) => m.title === "Stylesheet");
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

    const styles = timeline!.moments.find((m) => m.title === "2 Stylesheets");
    expect(styles?.waterfall?.map((bar) => bar.renderBlocking)).toEqual([
      "blocking",
      "potentially-blocking",
    ]);
    expect(styles?.kind).toBe("blocking");
    expect(
      timeline!.moments.find((m) => m.title === "Font")?.waterfall?.[0]?.renderBlocking,
    ).toBe("potentially-blocking");
    expect(
      timeline!.moments.find((m) => m.title === "Image")?.waterfall?.[0]?.renderBlocking,
    ).toBe("non-blocking");
    expect(
      timeline!.moments.find((m) => m.title === "Script")?.waterfall?.[0]?.renderBlocking,
    ).toBe("potentially-blocking");
    expect(timeline!.networkBars.find((bar) => bar.url.endsWith("app.css"))?.isRenderBlocking).toBe(
      true,
    );
    expect(
      timeline!.networkBars.find((bar) => bar.url.endsWith("print.css"))?.isRenderBlocking,
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

    const attributed = timeline!.moments.find(
      (moment) => moment.detail.includes("tag.js") && moment.id.startsWith("long-task-"),
    );
    expect(attributed?.waterfall?.[0]).toMatchObject({
      scriptSize: "48.8 KiB",
      downloadDuration: "400 ms",
      downloadStartMs: 100,
      downloadEndMs: 500,
      coverage: "50% used · 24.4 KiB used of 48.8 KiB · 24.4 KiB unused",
    });

    const unattributed = timeline!.moments.find((moment) =>
      moment.detail.startsWith("Unattributed"),
    );
    expect(unattributed?.waterfall?.[0]?.scriptSize).toBeUndefined();
    expect(unattributed?.waterfall?.[0]?.downloadDuration).toBeUndefined();
    expect(unattributed?.waterfall?.[0]?.coverage).toBeUndefined();

    const documentTask = timeline!.moments.find(
      (moment) => moment.waterfall?.[0]?.href === "https://example.com/",
    );
    expect(documentTask?.waterfall?.[0]?.scriptSize).toBeUndefined();
    expect(documentTask?.waterfall?.[0]?.coverage).toBeUndefined();
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
    const redirects = timeline!.phases
      .flatMap((p) => p.steps)
      .find((s) => s.id === "nav-redirects");
    expect(redirects?.timeMs).toBe(0);
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

    const redirects = timeline!.phases
      .flatMap((p) => p.steps)
      .find((s) => s.id === "nav-redirects");
    const redirectBar = timeline!.networkBars.find((bar) => bar.statusCode === 307);
    const documentBar = timeline!.networkBars.find((bar) => bar.statusCode === 200);

    expect(redirects?.timeMs).toBe(redirectBar?.startMs);
    expect(redirects?.endMs).toBe(redirectBar?.endMs);
    expect(redirects!.endMs! - redirects!.timeMs!).toBeLessThan(1000);
    expect(redirects?.detail).not.toMatch(/2\.39 s/);
    expect(redirects?.waterfall?.map((bar) => bar.href)).toEqual(["https://www.nextjs.org/"]);
    expect(redirects?.table?.rows[0]?.map((cell) => cell.text)).toContain("status 307");
    expect(
      timeline!.moments.some(
        (moment) => moment.id.startsWith("net-") && moment.detail.includes("307"),
      ),
    ).toBe(false);
    expect(
      timeline!.moments.some(
        (moment) => moment.id.startsWith("net-") && moment.detail.includes("nextjs.org/"),
      ),
    ).toBe(true);
    expect(redirectBar!.endMs).toBeLessThan(601);
    expect(documentBar!.endMs).toBeGreaterThanOrEqual(601);
    expect(timeline!.milestones.find((m) => m.id === "m-ttfb")?.timeMs).toBe(601);
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

    const redirects = timeline!.moments.find((moment) => moment.id === "nav-redirects");
    expect(redirects?.waterfall?.map((bar) => bar.href)).toEqual([
      "http://example.com/",
      "https://example.com/",
    ]);
    expect(redirects?.timeMs).toBe(1);
    expect(redirects?.endMs).toBe(120);
    expect(timeline!.moments.filter((moment) => moment.id === "nav-redirects")).toHaveLength(1);
    expect(
      timeline!.moments.filter((moment) => moment.id.startsWith("net-")).map((moment) => moment.title),
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

    const fcpStep = timeline!.phases.flatMap((p) => p.steps).find((s) => s.id === "render-fcp");
    expect(fcpStep?.detail).toMatch(/First Paint was/i);

    const shots = timeline!.moments.filter((m) => m.id.startsWith("screenshot-"));
    expect(shots.map((m) => ({ timeMs: m.timeMs, data: m.screenshot?.data }))).toEqual([
      { timeMs: 1500, data: "late-frame" },
      { timeMs: 2800, data: "later" },
    ]);
    expect(timeline!.moments.find((m) => m.id === "render-fcp")?.screenshot).toBeUndefined();
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

    const shots = timeline!.moments.filter((m) => m.id.startsWith("screenshot-"));
    expect(shots.map((m) => m.screenshot?.data)).toEqual(["img-early", "img-fcp", "img-lcp"]);
    expect(shots.map((m) => m.timeMs)).toEqual([800, 1300, 2600]);
    const fcp = timeline!.moments.find((m) => m.id === "render-fcp");
    expect(fcp?.network).toEqual([]);
    expect(fcp?.findings).toEqual([]);
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

    const firstByte = timeline!.lcpSegments.find((seg) => seg.subpart === "timeToFirstByte");
    const render = timeline!.lcpSegments.find((seg) => seg.subpart === "elementRenderDelay");
    expect(timeline!.milestones.find((m) => m.id === "m-ttfb")?.timeMs).toBe(601);
    expect(findMarked(timeline!, "req-ttfb")?.detail).toMatch(/First byte at 601 ms/);
    expect(firstByte?.durationMs).toBe(601);
    expect(render?.durationMs).toBeCloseTo(6980 - 601, 5);
    expect(timeline!.lcpSegments.reduce((sum, seg) => sum + seg.durationMs, 0)).toBeCloseTo(6980, 5);
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

    const moments = timeline!.moments;
    const fcpIdx = moments.findIndex((m) => m.id === "render-fcp");
    const lcpIdx = moments.findIndex((m) => m.id === "sub-lcp");
    expect(fcpIdx).toBeGreaterThanOrEqual(0);
    expect(lcpIdx).toBeGreaterThan(fcpIdx);

    const between = moments.slice(fcpIdx + 1, lcpIdx);
    expect(moments.some((m) => m.id === "lcp-seg-elementRenderDelay")).toBe(false);
    const tasks = moments.filter((moment) => moment.id.startsWith("long-task-"));
    expect(tasks.map((moment) => moment.timeMs)).toEqual([2600, 9000]);
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

    const ttfb = timeline!.milestones.find((m) => m.id === "m-ttfb");
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

    expect(timeline!.milestones.find((m) => m.id === "m-ttfb")?.timeMs).toBe(120);
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
    expect(findMarked(timeline!, "req-ttfb")).toBeUndefined();
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
    expect(timeline!.milestones.find((m) => m.id === "m-ttfb")?.timeMs).toBe(601);
    expect(timeline!.milestones.find((m) => m.id === "m-fcp")?.timeMs).toBe(2819);
    expect(timeline!.milestones.find((m) => m.id === "m-lcp")?.timeMs).toBe(19463);
    expect(timeline!.milestones.find((m) => m.id === "m-lcp")?.rating).toBe("poor");

    const ttfb = findMarked(timeline!, "req-ttfb");
    expect(ttfb?.detail).toMatch(/601 ms/);
    expect(ttfb?.detail).toMatch(/Slow 4G, 4× CPU/);

    const css = timeline!.networkBars.find((bar) => bar.url.includes("app.css"));
    expect(css!.endMs - css!.startMs).toBeGreaterThan(371 - 345);

    const attributed = timeline!.mainThreadBlocks.find((block) => block.url?.includes("app.js"));
    expect(attributed).toMatchObject({ startMs: 8000, durationMs: 180 });

    const observed = timeline!.mainThreadBlocks.find((block) => !block.url);
    expect(observed?.durationMs).toBe(400);
    // Post-paint observed work that fits in the CPU budget lands in the FCP→LCP gap.
    expect(observed!.startMs).toBeGreaterThan(2819);
    expect(observed!.startMs).toBeLessThan(19463);

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
    const attributed = timeline!.mainThreadBlocks.filter((block) => block.url === script);
    expect(attributed.map((block) => [block.startMs, block.durationMs])).toEqual([
      [3645, 61],
      [5733, 170],
    ]);

    const card = timeline!.moments.find((moment) => moment.timeMs === 3645);
    expect(card?.detail).toBe(
      "nextjs.org/_next/static/immutable/chunks/1k7fgn… blocked the main thread for 61 ms.",
    );
    expect(card?.endMs).toBe(3706);

    const observed = timeline!.mainThreadBlocks.filter((block) => !block.url);
    expect(observed).toHaveLength(1);
    expect(observed[0]?.durationMs).toBeCloseTo(202.4, 5);
    expect(timeline!.moments.some((moment) => moment.timeMs > 20000)).toBe(false);
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

    expect(timeline!.mainThreadBlocks.map((block) => block.durationMs)).toEqual([105, 325.6]);
    expect(timeline!.mainThreadBlocks[0]).toMatchObject({
      startMs: 900,
      url: "https://example.com/app.js",
    });
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

    const steps = timeline!.phases.flatMap((p) => p.steps);
    const userSteps = steps.filter((s) => s.id.startsWith("user-timing-"));
    expect(userSteps.map((s) => s.title)).toEqual([
      "Next.js-before-hydration",
      "Next.js-hydration",
      "beforeRender",
      "sentry-tracing-init",
    ]);

    const hydration = userSteps.find((s) => s.title === "Next.js-hydration");
    expect(hydration?.timeMs).toBe(1144);
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

    const hero = timeline!.moments.find((m) => m.title === "Image");
    expect(hero?.detail).toMatch(/priority Low/);
    expect(hero?.waterfall?.[0]?.priority).toBe("Low");
    expect(hero?.table?.headers.map((h) => h.text)).toContain("Priority");
    expect(hero?.table?.rows[0]?.[3]).toEqual({ text: "Low", align: "end" });
    expect(timeline!.networkBars.find((b) => b.url.includes("hero"))?.priority).toBe("Low");
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

    const lcp = timeline!.moments.find((m) => m.id === "sub-lcp");
    expect(lcp?.notes).toHaveLength(1);
    expect(lcp?.notes?.[0]).toMatchObject({
      id: "lcp-discovery-priorityHinted",
      title: "LCP discovery",
      detail: "fetchpriority=high should be applied",
      kind: "blocking",
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

    expect(timeline!.phases.some((p) => p.id === "connection")).toBe(true);
    const preconnect = timeline!.moments.find((m) => m.id === "conn-preconnect");
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

    expect(timeline!.moments.some((m) => /speed index/i.test(m.title))).toBe(false);
    expect(timeline!.milestones.some((m) => /speed index/i.test(m.label))).toBe(false);
    const steps = timeline!.phases.flatMap((phase) => phase.steps);
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

    const script = timeline!.moments.find((m) => m.title === "Script");
    expect(script?.detail).toMatch(/critical chain \(800 ms\)/);
  });
});
