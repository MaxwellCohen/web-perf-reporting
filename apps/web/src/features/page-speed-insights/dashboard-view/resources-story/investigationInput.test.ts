import { describe, expect, it } from "vitest";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { inputFromEntry } from "./investigationInput";

function entry(audits: Record<string, unknown>): InsightsContextItem {
  return {
    label: "Mobile",
    item: { lighthouseResult: { audits } },
  } as unknown as InsightsContextItem;
}

function table(items: unknown[], type = "table") {
  return { details: { type, headings: [], items } };
}

const fullEntry = entry({
  "resource-summary": table([
    { resourceType: "total", label: "Total", requestCount: 12, transferSize: 5000 },
    { resourceType: "script", label: "Script", requestCount: 4, transferSize: 3000 },
    { resourceType: "third-party", label: "Third-party", requestCount: 3, transferSize: 1200 },
  ]),
  "network-requests": table([
    { url: "https://example.com/a.js", resourceType: "Script", transferSize: 2000 },
    { url: "https://example.com/b.js", resourceType: "script", transferSize: 1000.5 },
    { url: "data:text/javascript,x", resourceType: "Script", transferSize: 500 },
    {
      url: "https://example.com/c.js",
      protocol: "blob",
      resourceType: "Script",
      transferSize: 700,
    },
    { url: "https://example.com/i.png", resourceType: "Image", transferSize: 900 },
  ]),
  "mainthread-work-breakdown": table([
    { group: "scriptEvaluation", duration: 100 },
    { group: "other", duration: 20.5 },
    { group: "paint", duration: "7" },
  ]),
  diagnostics: table([{ totalTaskTime: 250 }]),
  "main-thread-tasks": table([{ duration: 10 }, { duration: 20 }]),
  "unused-javascript": table([
    { url: "https://example.com/a.js", wastedBytes: 400, unusedBytes: 999 },
    { url: "https://example.com/b.js", unusedBytes: 50 },
    { url: "https://example.com/c.js", totalBytes: 10 },
  ]),
});

const fallbackEntry = entry({
  "resource-summary": table([
    { resourceType: "total", label: "Total", requestCount: 0, transferSize: 4096 },
    { resourceType: "image", label: "Image", requestCount: 2, transferSize: 4096 },
  ]),
  "network-requests": table([
    { url: "https://example.com/a.js", resourceType: "Script", transferSize: -5 },
    { url: "https://example.com/b.js", resourceType: "Script", transferSize: Number.NaN },
  ]),
  diagnostics: table([{ totalTaskTime: "n/a" }]),
  "main-thread-tasks": table([{ duration: 30 }, { duration: Number.NaN }, { duration: 12 }]),
  "mainthread-work-breakdown": table([{ group: "other" }]),
  "unused-javascript": table([{ url: "https://example.com/a.js", totalBytes: 100 }]),
});

const emptyEntry = entry({
  "resource-summary": { details: { type: "opportunity", items: [] } },
  "network-requests": { details: { type: "debugdata" } },
});

const SIX = [
  "totalBytes",
  "requestCount",
  "thirdPartyBytes",
  "scriptBytes",
  "unusedBytes",
  "mainThreadMs",
  "longTaskMs",
] as const;

function six(item: InsightsContextItem) {
  const input = inputFromEntry(item);
  return Object.fromEntries(SIX.map((key) => [key, input[key]]));
}

const EXPECTED_FULL = {
  totalBytes: 5000,
  requestCount: 12,
  thirdPartyBytes: 1200,
  scriptBytes: 3000.5,
  unusedBytes: 450,
  mainThreadMs: 120.5,
  longTaskMs: 250,
};

const EXPECTED_FALLBACK = {
  totalBytes: 4096,
  requestCount: 0,
  thirdPartyBytes: null,
  scriptBytes: -5,
  unusedBytes: null,
  mainThreadMs: null,
  longTaskMs: 42,
};

const EXPECTED_EMPTY = {
  totalBytes: null,
  requestCount: null,
  thirdPartyBytes: null,
  scriptBytes: null,
  unusedBytes: null,
  mainThreadMs: null,
  longTaskMs: null,
};

describe("inputFromEntry totals", () => {
  it("reads transfer, requests, third-party, scripts, unused, and main-thread totals", () => {
    expect(six(fullEntry)).toEqual(EXPECTED_FULL);
  });

  it("falls back to task durations and ignores non-finite values", () => {
    expect(six(fallbackEntry)).toEqual(EXPECTED_FALLBACK);
  });

  it("leaves every total null when the audits have no usable rows", () => {
    expect(six(emptyEntry)).toEqual(EXPECTED_EMPTY);
    expect(six(entry({}))).toEqual(EXPECTED_EMPTY);
  });
});

describe("inputFromEntry full result", () => {
  const detailed = {
    label: "Mobile",
    item: {
      lighthouseResult: {
        entities: [
          { name: "example.com", isFirstParty: true },
          { name: "cdn.vendor.com", isFirstParty: false },
          { name: "ads.net" },
          { isFirstParty: false },
        ],
        audits: {
          metrics: { details: { items: [{ observedLoad: 2345.6 }] } },
          "resource-summary": table([
            { resourceType: "total", label: "Total", requestCount: 5, transferSize: 4000 },
            { resourceType: "script", label: "Script", requestCount: 3, transferSize: 2500 },
            {
              resourceType: "third-party",
              label: "Third-party",
              requestCount: 2,
              transferSize: 900,
            },
          ]),
          "network-requests": table([
            {
              url: "https://example.com/app.js",
              resourceType: "Script",
              transferSize: 1500,
              entity: "example.com",
            },
            {
              url: "https://cdn.vendor.com/lib.js",
              resourceType: "script",
              transferSize: 800,
              entity: "cdn.vendor.com",
            },
            {
              url: "https://ads.net/ad.png",
              resourceType: "Image",
              transferSize: 100,
              entity: "ads.net",
            },
            { url: "https://example.com/font.woff", transferSize: 300, entity: "unknown.org" },
            { url: "https://example.com/zero.js", resourceType: "Script", transferSize: 0 },
            { resourceType: "Script", transferSize: 50 },
          ]),
          "mainthread-work-breakdown": table([
            { group: "scriptEvaluation", duration: 120 },
            { group: "other", duration: 30 },
          ]),
          diagnostics: table([{ totalTaskTime: 180 }]),
          "unused-javascript": table([
            { url: "https://example.com/app.js", wastedBytes: 600, unusedBytes: 700 },
            { url: "https://cdn.vendor.com/lib.js", unusedBytes: 200 },
            { url: "https://example.com/extra.js", wastedBytes: 40 },
            { wastedBytes: 999 },
          ]),
          "bootup-time": table([
            { url: "https://example.com/app.js", total: 90, scripting: 10, scriptParseCompile: 5 },
            { url: "https://cdn.vendor.com/lib.js", scripting: 30, scriptParseCompile: 10 },
            { url: "https://example.com/extra.js", total: 7 },
            { total: 500 },
          ]),
        },
      },
    },
  } as unknown as InsightsContextItem;

  it("returns every field for a realistic report", () => {
    expect(inputFromEntry(detailed)).toEqual({
      label: "Mobile",
      totalBytes: 4000,
      requestCount: 5,
      thirdPartyBytes: 900,
      scriptBytes: 2350,
      unusedBytes: 1839,
      mainThreadMs: 150,
      longTaskMs: 180,
      loadTimeMs: 2345.6,
      requests: [
        {
          url: "https://example.com/app.js",
          resourceType: "Script",
          transferSize: 1500,
          thirdParty: false,
          entity: "example.com",
        },
        {
          url: "https://cdn.vendor.com/lib.js",
          resourceType: "script",
          transferSize: 800,
          thirdParty: true,
          entity: "cdn.vendor.com",
        },
        {
          url: "https://ads.net/ad.png",
          resourceType: "Image",
          transferSize: 100,
          thirdParty: true,
          entity: "ads.net",
        },
        {
          url: "https://example.com/font.woff",
          resourceType: "Other",
          transferSize: 300,
          thirdParty: false,
          entity: "unknown.org",
        },
      ],
      scripts: [
        { url: "https://example.com/app.js", transferSize: 1500, unusedBytes: 600, bootupMs: 90 },
        { url: "https://cdn.vendor.com/lib.js", transferSize: 800, unusedBytes: 200, bootupMs: 40 },
        { url: "https://example.com/zero.js", transferSize: 0, unusedBytes: 0, bootupMs: 0 },
        { url: "https://example.com/extra.js", transferSize: 0, unusedBytes: 40, bootupMs: 7 },
      ],
    });
  });

  it("skips non-network schemes for script bytes but keeps their rows", () => {
    const result = inputFromEntry(fullEntry);
    expect(result.scriptBytes).toBe(3000.5);
    expect(result.scripts).toEqual([
      { url: "https://example.com/a.js", transferSize: 2000, unusedBytes: 400, bootupMs: 0 },
      { url: "https://example.com/b.js", transferSize: 1000.5, unusedBytes: 50, bootupMs: 0 },
      { url: "data:text/javascript,x", transferSize: 500, unusedBytes: 0, bootupMs: 0 },
      { url: "https://example.com/c.js", transferSize: 700, unusedBytes: 0, bootupMs: 0 },
    ]);
    expect(result.requests.map((request) => request.url)).toEqual([
      "https://example.com/a.js",
      "https://example.com/b.js",
      "data:text/javascript,x",
      "https://example.com/c.js",
      "https://example.com/i.png",
    ]);
    expect(result.requests.every((request) => request.thirdParty === false)).toBe(true);
    expect(result.requests.every((request) => !("entity" in request))).toBe(true);
    expect(result.loadTimeMs).toBeNull();
  });

  it("reports no script bytes when every script is a non-network request", () => {
    const result = inputFromEntry(
      entry({
        "network-requests": table([
          { url: "data:text/javascript,x", resourceType: "Script", transferSize: 5 },
          { url: "https://example.com/b.js", protocol: "blob", resourceType: "Script" },
          { url: "chrome-extension://abc/x.js", resourceType: "Script", transferSize: 9 },
        ]),
      }),
    );
    expect(result.scriptBytes).toBeNull();
  });

  it("falls back from wastedBytes to unusedBytes per row and sums both totals", () => {
    const result = inputFromEntry(fallbackEntry);
    expect(result.unusedBytes).toBeNull();
    expect(result.scripts).toEqual([
      { url: "https://example.com/a.js", transferSize: -5, unusedBytes: 0, bootupMs: 0 },
      { url: "https://example.com/b.js", transferSize: 0, unusedBytes: 0, bootupMs: 0 },
    ]);
    expect(result.requests).toEqual([]);

    const mixed = inputFromEntry(
      entry({
        "unused-javascript": table([
          { url: "https://example.com/a.js", wastedBytes: 10, unusedBytes: 99 },
          { url: "https://example.com/a.js", unusedBytes: 5 },
          { url: "https://example.com/b.js", unusedBytes: 30 },
        ]),
      }),
    );
    expect(mixed.unusedBytes).toBe(45);
    expect(mixed.scripts).toEqual([
      { url: "https://example.com/a.js", transferSize: 0, unusedBytes: 15, bootupMs: 0 },
      { url: "https://example.com/b.js", transferSize: 0, unusedBytes: 30, bootupMs: 0 },
    ]);
  });

  it("falls back to parse plus scripting time when a bootup row has no total", () => {
    const result = inputFromEntry(
      entry({
        "bootup-time": table([
          { url: "https://example.com/a.js", scripting: 12.5, scriptParseCompile: 7.5 },
          { url: "https://example.com/b.js", scripting: "x" },
          { url: "https://example.com/c.js", total: 3, scripting: 100 },
        ]),
      }),
    );
    expect(result.scripts.map((script) => [script.url, script.bootupMs])).toEqual([
      ["https://example.com/a.js", 20],
      ["https://example.com/b.js", 0],
      ["https://example.com/c.js", 3],
    ]);
  });

  it("uses diagnostics task time over summed tasks for long tasks, and sums tasks otherwise", () => {
    expect(inputFromEntry(fullEntry).longTaskMs).toBe(250);
    expect(
      inputFromEntry(entry({ "main-thread-tasks": table([{ duration: 80 }, { duration: 25 }]) }))
        .longTaskMs,
    ).toBe(105);
    expect(
      inputFromEntry(
        entry({
          diagnostics: table([{ totalTaskTime: 200 }]),
          "main-thread-tasks": table([{ duration: 50 }]),
        }),
      ).longTaskMs,
    ).toBe(200);
  });

  it("sums main-thread durations and reports unused bytes only when a row has a value", () => {
    const work = inputFromEntry(
      entry({
        "mainthread-work-breakdown": table([
          { group: "scriptEvaluation", duration: 100 },
          { group: "styleLayout", duration: 50 },
          { group: "other", duration: 0.5 },
        ]),
        "unused-javascript": table([
          { url: "https://example.com/app.js" },
          { url: "https://example.com/vendor.js", wastedPercent: 40, totalBytes: 5000 },
        ]),
      }),
    );
    expect(work.mainThreadMs).toBe(150.5);
    expect(work.unusedBytes).toBeNull();
  });

  it("reads load time only from a positive finite observedLoad", () => {
    const load = (observedLoad: unknown) =>
      inputFromEntry(entry({ metrics: { details: { items: [{ observedLoad }] } } })).loadTimeMs;
    expect(load(1800)).toBe(1800);
    expect(load(0)).toBeNull();
    expect(load(-1)).toBeNull();
    expect(load(Number.NaN)).toBeNull();
    expect(load("1800")).toBeNull();
    expect(inputFromEntry(entry({ metrics: { details: { items: [] } } })).loadTimeMs).toBeNull();
  });

  it("returns empty rows and null totals for a report with no audits", () => {
    expect(inputFromEntry(entry({}))).toEqual({
      label: "Mobile",
      totalBytes: null,
      requestCount: null,
      thirdPartyBytes: null,
      scriptBytes: null,
      unusedBytes: null,
      mainThreadMs: null,
      longTaskMs: null,
      loadTimeMs: null,
      requests: [],
      scripts: [],
    });
    expect(
      inputFromEntry({ label: "Desktop", item: {} } as unknown as InsightsContextItem),
    ).toMatchObject({ label: "Desktop", totalBytes: null, requests: [], scripts: [] });
  });

  it("keeps independent labels, totals only from tiles, and skips empty tiles", () => {
    const result = inputFromEntry(
      entry({
        "resource-summary": table([
          { resourceType: "script", label: "Script", requestCount: 4, transferSize: 600 },
          { resourceType: "third-party", label: "Third-party", requestCount: 3, transferSize: 80 },
          { resourceType: "media", label: "Media", requestCount: 0, transferSize: 0 },
        ]),
      }),
    );
    expect(result.totalBytes).toBeNull();
    expect(result.requestCount).toBeNull();
    expect(result.thirdPartyBytes).toBe(80);
  });
});
