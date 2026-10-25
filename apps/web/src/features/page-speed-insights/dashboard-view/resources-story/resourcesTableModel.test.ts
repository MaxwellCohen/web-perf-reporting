import { describe, expect, it } from "vitest";
import type { CombinedLoad } from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";
import { resourcesTableFromLoad } from "@/features/page-speed-insights/dashboard-view/resources-story/resourcesTableModel";

function load(overrides: Partial<CombinedLoad> = {}): CombinedLoad {
  return {
    label: "Mobile",
    ttfbObserved: false,
    requests: [],
    redirectHops: [],
    redirectAuditUrls: [],
    longTasks: [],
    userTimings: [],
    screenshots: [],
    lcpSegments: [],
    lcpDiscoveryFailures: [],
    layoutShifts: [],
    preconnectCandidates: [],
    ...overrides,
  };
}

describe("resourcesTableFromLoad", () => {
  it("maps request fields and rolls long tasks up by URL", () => {
    const rows = resourcesTableFromLoad(
      load({
        requests: [
          {
            url: "https://cdn.example.com/app.js",
            resourceType: "Script",
            networkRequestTime: 40,
            networkEndTime: 140,
            transferSize: 80_000,
            resourceSize: 200_000,
            statusCode: 200,
            protocol: "h2",
            mimeType: "text/javascript",
            entity: "CDN",
            priority: "High",
            renderBlocking: "blocking",
            isCriticalChain: true,
            isLinkPreload: true,
            coverage: { totalBytes: 200_000, wastedBytes: 50_000 },
            scriptCpu: { totalMs: 320, scriptingMs: 200, parseMs: 40 },
          },
        ],
        longTasks: [
          { url: "https://cdn.example.com/app.js#init", startTime: 150, duration: 80 },
          { url: "https://cdn.example.com/app.js?cache=1", startTime: 240, duration: 60 },
          { url: "https://cdn.example.com/app.js", startTime: 300, duration: 20 },
          { url: "https://other.example/x.js", startTime: 100, duration: 90 },
        ],
      }),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      url: "https://cdn.example.com/app.js",
      resourceType: "Script",
      statusCode: 200,
      transferSize: 80_000,
      resourceSize: 200_000,
      unusedBytes: 50_000,
      totalBytes: 200_000,
      unusedShare: 25,
      longTaskCount: 2,
      longTaskMs: 140,
      scriptCpuMs: 320,
      scriptingMs: 200,
      parseMs: 40,
      networkStartMs: 40,
      durationMs: 100,
      priority: "High",
      renderBlocking: "blocking",
      isCriticalChain: true,
      isLinkPreload: true,
      entity: "CDN",
    });
  });

  it("leaves coverage and long-task time empty when nothing is mapped", () => {
    const rows = resourcesTableFromLoad(
      load({
        requests: [
          {
            url: "https://example.com/photo.jpg",
            resourceType: "Image",
            networkRequestTime: 10,
            networkEndTime: 30,
            transferSize: 4_000,
            renderBlocking: "non-blocking",
            isCriticalChain: false,
          },
        ],
      }),
    );

    expect(rows[0]).toMatchObject({
      longTaskCount: 0,
      unusedBytes: undefined,
      unusedShare: undefined,
      longTaskMs: undefined,
      scriptCpuMs: undefined,
      resourceType: "Image",
    });
  });

  it("sorts heaviest transfer size first", () => {
    const rows = resourcesTableFromLoad(
      load({
        requests: [
          {
            url: "https://example.com/small.js",
            networkRequestTime: 0,
            networkEndTime: 10,
            transferSize: 100,
            renderBlocking: "non-blocking",
            isCriticalChain: false,
          },
          {
            url: "https://example.com/big.js",
            networkRequestTime: 0,
            networkEndTime: 10,
            transferSize: 9_000,
            renderBlocking: "non-blocking",
            isCriticalChain: false,
          },
        ],
      }),
    );

    expect(rows.map((row) => row.url)).toEqual([
      "https://example.com/big.js",
      "https://example.com/small.js",
    ]);
  });
});
