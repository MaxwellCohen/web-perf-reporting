import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { LCPBreakdownCard } from "@/features/page-speed-insights/network-metrics/LCPBreakdownCard";
import { renderWithPageSpeedInsightsStore } from "@/features/page-speed-insights/test-utils/renderWithPageSpeedInsightsStore";
import type { NullablePageSpeedInsights } from "@/lib/schema";

vi.mock("recharts", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

function insightWithAudits(audits: Record<string, unknown>): NullablePageSpeedInsights {
  return {
    lighthouseResult: {
      lighthouseVersion: "12.8.2",
      finalDisplayedUrl: "https://example.com",
      configSettings: { formFactor: "mobile" },
      fullPageScreenshot: {
        nodes: {},
        screenshot: { data: "image-data", height: 200, width: 100 },
      },
      audits,
    },
    analysisUTCTimestamp: "2024-02-03T12:00:00.000Z",
  } as unknown as NullablePageSpeedInsights;
}

const breakdownTable = {
  "lcp-breakdown-insight": {
    details: {
      items: [
        {
          type: "table",
          items: [
            {
              subpart: "timeToFirstByte",
              label: "TTFB",
              duration: 100,
            },
            {
              subpart: "resourceLoadDuration",
              label: "Resource Load",
              duration: 200,
            },
          ],
        },
      ],
    },
  },
};

const possibleRemountAudits = {
  "lcp-discovery-insight": { scoreDisplayMode: "notApplicable" },
  "lcp-breakdown-insight": {
    details: {
      items: [
        {
          type: "table",
          items: [
            { subpart: "timeToFirstByte", label: "TTFB", duration: 50 },
            { subpart: "elementRenderDelay", label: "Element render delay", duration: 950 },
          ],
        },
      ],
    },
  },
  metrics: {
    details: {
      items: [
        {
          observedFirstContentfulPaint: 600,
          observedLargestContentfulPaint: 2600,
        },
      ],
    },
  },
};

describe("LCPBreakdownCard", () => {
  it("returns null when metrics empty", () => {
    const { container } = renderWithPageSpeedInsightsStore(<LCPBreakdownCard />, {
      data: [],
      labels: [],
      isLoading: false,
    });
    expect(container.firstChild).toBeNull();
  });

  it("returns null when metrics have no lcp-breakdown-insight audit", () => {
    const { container } = renderWithPageSpeedInsightsStore(<LCPBreakdownCard />, {
      data: [insightWithAudits({})],
      labels: ["Desktop"],
      isLoading: false,
    });
    expect(container.firstChild).toBeNull();
  });

  it("renders table and chart when metrics have breakdown data", () => {
    const { container } = renderWithPageSpeedInsightsStore(<LCPBreakdownCard />, {
      data: [insightWithAudits(breakdownTable)],
      labels: ["Desktop"],
      isLoading: false,
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.firstChild).toMatchSnapshot();
  });

  it("shows possible LCP remount alert when three PSI proxies match", () => {
    const { container } = renderWithPageSpeedInsightsStore(<LCPBreakdownCard />, {
      data: [insightWithAudits(possibleRemountAudits)],
      labels: ["Mobile"],
      isLoading: false,
    });
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("Possible LCP remount");
    expect(alert?.textContent).toContain("Mobile");
  });
});
