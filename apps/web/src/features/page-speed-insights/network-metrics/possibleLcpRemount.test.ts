import { describe, expect, it } from "vitest";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import {
  detectPossibleLcpRemount,
  ELEMENT_RENDER_DELAY_SHARE_THRESHOLD,
  LCP_AFTER_FCP_MS_THRESHOLD,
} from "./possibleLcpRemount";

function itemWithAudits(audits: Record<string, unknown>, label = "Mobile"): InsightsContextItem {
  return {
    label,
    item: {
      lighthouseResult: { audits },
    },
  } as InsightsContextItem;
}

function matchingAudits(overrides: {
  discoveryMode?: string;
  subparts?: Array<{ subpart: string; duration: number }>;
  fcp?: number;
  lcp?: number;
} = {}) {
  const {
    discoveryMode = "notApplicable",
    subparts = [
      { subpart: "timeToFirstByte", duration: 50 },
      { subpart: "elementRenderDelay", duration: 950 },
    ],
    fcp = 600,
    lcp = 2600,
  } = overrides;

  return {
    "lcp-discovery-insight": { scoreDisplayMode: discoveryMode },
    "lcp-breakdown-insight": {
      details: {
        items: [{ type: "table", items: subparts }],
      },
    },
    metrics: {
      details: {
        items: [
          {
            observedFirstContentfulPaint: fcp,
            observedLargestContentfulPaint: lcp,
          },
        ],
      },
    },
  };
}

describe("detectPossibleLcpRemount", () => {
  it("returns empty when items empty", () => {
    expect(detectPossibleLcpRemount([])).toEqual([]);
  });

  it("matches when all three signals are present", () => {
    const matches = detectPossibleLcpRemount([itemWithAudits(matchingAudits())]);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      label: "Mobile",
      observedFcpMs: 600,
      observedLcpMs: 2600,
      lcpAfterFcpMs: 2000,
    });
    expect(matches[0]!.elementRenderDelayShare).toBeGreaterThanOrEqual(
      ELEMENT_RENDER_DELAY_SHARE_THRESHOLD,
    );
  });

  it("skips when lcp-discovery-insight is applicable (image LCP)", () => {
    expect(
      detectPossibleLcpRemount([
        itemWithAudits(matchingAudits({ discoveryMode: "informative" })),
      ]),
    ).toEqual([]);
  });

  it("skips when element render delay is not dominant", () => {
    expect(
      detectPossibleLcpRemount([
        itemWithAudits(
          matchingAudits({
            subparts: [
              { subpart: "timeToFirstByte", duration: 100 },
              { subpart: "resourceLoadDuration", duration: 700 },
              { subpart: "elementRenderDelay", duration: 200 },
            ],
          }),
        ),
      ]),
    ).toEqual([]);
  });

  it("skips when observed LCP is not substantially after FCP", () => {
    expect(
      detectPossibleLcpRemount([
        itemWithAudits(
          matchingAudits({
            fcp: 600,
            lcp: 600 + LCP_AFTER_FCP_MS_THRESHOLD - 1,
          }),
        ),
      ]),
    ).toEqual([]);
  });

  it("returns a match per report label that qualifies", () => {
    const matches = detectPossibleLcpRemount([
      itemWithAudits(matchingAudits(), "Mobile"),
      itemWithAudits(matchingAudits({ discoveryMode: "informative" }), "Desktop"),
    ]);

    expect(matches.map((m) => m.label)).toEqual(["Mobile"]);
  });
});
