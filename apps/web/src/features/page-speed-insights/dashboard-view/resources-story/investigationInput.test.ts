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
