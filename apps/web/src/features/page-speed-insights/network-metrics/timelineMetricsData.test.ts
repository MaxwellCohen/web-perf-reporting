import { describe, expect, it } from "vitest";
import { buildTimelineChartRows } from "@/features/page-speed-insights/network-metrics/timelineMetricsData";
import type { NetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsData";

describe("buildTimelineChartRows", () => {
  it("builds sorted timeline rows with TTFB offset for load events", () => {
    const series = [
      {
        label: "Mobile",
        ttfb: 100,
        fcp: 200,
        lcp: 500,
        domContentLoaded: 400,
        loadTime: 700,
        interactive: 800,
        networkRequests: [],
        networkRTT: [],
        serverLatency: [],
      },
    ] as unknown as NetworkMetricSeries[];

    const rows = buildTimelineChartRows(series);
    const ttfbRow = rows.find((r) => r.event === "TTFB");
    const loadRow = rows.find((r) => r.event === "Load");

    expect(ttfbRow?.Mobile).toBe(100);
    expect(loadRow?.Mobile).toBe(800);
  });
});
