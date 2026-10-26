import { describe, expect, it } from "vitest";
import { mapItemsToNetworkMetrics } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsData";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";

function mobileItem(): InsightsContextItem {
  return {
    label: "Mobile",
    item: {
      lighthouseResult: {
        configSettings: { formFactor: "mobile", throttlingMethod: "simulate" },
        audits: {
          metrics: {
            id: "metrics",
            details: {
              type: "debugdata",
              items: [
                {
                  timeToFirstByte: 601,
                  firstContentfulPaint: 2819,
                  largestContentfulPaint: 6980,
                  observedFirstContentfulPaint: 1200,
                  observedLargestContentfulPaint: 2500,
                  observedFirstPaint: 1100,
                  observedDomContentLoaded: 900,
                  observedLoad: 3000,
                  interactive: 9000,
                },
              ],
            },
          },
          "server-response-time": { id: "server-response-time", numericValue: 94 },
          "network-requests": {
            id: "network-requests",
            details: {
              type: "table",
              headings: [],
              items: [
                {
                  url: "https://example.com/",
                  resourceType: "Document",
                  networkRequestTime: 0,
                  networkEndTime: 100,
                  rendererStartTime: 0,
                },
              ],
            },
          },
        },
      },
    } as InsightsContextItem["item"],
  };
}

describe("mapItemsToNetworkMetrics", () => {
  it("warps mobile observed timings onto the simulated lab clock", () => {
    const [series] = mapItemsToNetworkMetrics([mobileItem()]);
    expect(series?.simulationLabel).toMatch(/Slow 4G/);
    expect(series?.fcp).toBe(2819);
    expect(series?.lcp).toBe(6980);
    expect(series?.observedFirstContentfulPaint).not.toBe(1200);
    expect(series?.observedFirstContentfulPaint).toBeGreaterThan(1200);
  });

  it("leaves observed timings unchanged when throttling is already in the trace", () => {
    const item = mobileItem();
    item.item = {
      ...item.item,
      lighthouseResult: {
        ...item.item.lighthouseResult!,
        configSettings: { formFactor: "mobile", throttlingMethod: "devtools" },
      },
    } as InsightsContextItem["item"];

    const [series] = mapItemsToNetworkMetrics([item]);
    expect(series?.simulationLabel).toBeUndefined();
    expect(series?.observedFirstContentfulPaint).toBe(1200);
    expect(series?.fcp).toBe(2819);
  });
});
