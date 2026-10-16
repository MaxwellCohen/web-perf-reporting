import { describe, expect, it } from "vitest";
import { buildTimelineMoments } from "./buildTimelineMoments";
import type { TimelinePhase } from "./types";

const phases: TimelinePhase[] = [
  {
    id: "navigation",
    title: "Navigation start",
    startMs: 0,
    endMs: 10,
    steps: [
      {
        id: "nav-start",
        title: "navigationStart",
        status: "measured",
        kind: "marker",
        timeMs: 0,
        detail: "Start",
      },
    ],
  },
  {
    id: "firstRender",
    title: "First render",
    startMs: 200,
    endMs: 1200,
    steps: [
      {
        id: "render-fcp",
        title: "FCP",
        status: "measured",
        kind: "cwv",
        timeMs: 1000,
        detail: "First content",
        rating: "good",
      },
      {
        id: "net-0",
        title: "Stylesheet",
        status: "measured",
        kind: "blocking",
        timeMs: 80,
        endMs: 400,
        detail: "example.com/a.css",
      },
    ],
  },
  {
    id: "subresources",
    title: "Subresources finish",
    startMs: 1000,
    endMs: 2500,
    steps: [
      {
        id: "sub-lcp",
        title: "LCP",
        status: "measured",
        kind: "cwv",
        timeMs: 2400,
        detail: "Largest paint",
      },
    ],
  },
];

describe("buildTimelineMoments", () => {
  it("orders moments by time with 0 ms first", () => {
    const moments = buildTimelineMoments(phases, [{ timing: 1100, data: "shot" }], []);

    expect(moments[0]?.timeMs).toBe(0);
    expect(moments.map((m) => m.timeMs)).toEqual(
      [...moments].map((m) => m.timeMs).sort((a, b) => a - b),
    );
    expect(moments.find((m) => m.id === "nav-start")?.hasTimestamp).toBe(true);
    expect(moments.find((m) => m.id === "render-fcp")?.hasTimestamp).toBe(true);
  });

  it("attaches screenshots only to paint milestones", () => {
    const moments = buildTimelineMoments(
      phases,
      [
        { timing: 1100, data: "fcp-shot" },
        { timing: 2500, data: "lcp-shot" },
      ],
      [{ subpart: "elementRenderDelay", label: "Render delay", durationMs: 100, startMs: 0, endMs: 100 }],
      "Hero",
    );

    const fcp = moments.find((m) => m.id === "render-fcp");
    const lcp = moments.find((m) => m.id === "sub-lcp");
    const stylesheet = moments.find((m) => m.id === "net-0");

    expect(fcp?.screenshot?.data).toBe("fcp-shot");
    expect(lcp?.screenshot?.data).toBe("lcp-shot");
    expect(stylesheet?.screenshot).toBeUndefined();
    expect(lcp?.lcpSegments).toHaveLength(1);
    expect(lcp?.evidence[0]).toBe("Element: Hero");
  });

  it("marks the first moment of each phase", () => {
    const moments = buildTimelineMoments(phases, [], []);
    const phaseStarts = moments.filter((m) => m.isPhaseStart).map((m) => m.phaseId);
    expect(phaseStarts).toEqual(["navigation", "firstRender", "subresources"]);
  });

  it("leaves network, main thread, and findings empty on moments", () => {
    const moments = buildTimelineMoments(phases, [], []);
    for (const moment of moments) {
      expect(moment.network).toEqual([]);
      expect(moment.mainThread).toEqual([]);
      expect(moment.findings).toEqual([]);
    }
  });
});
