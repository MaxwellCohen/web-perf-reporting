import { describe, expect, it } from "vitest";
import { timelineToMarkdown } from "./timelineToMarkdown";
import type { PageLoadTimeline, TimelineEvent } from "./types";

function event(partial: Partial<TimelineEvent> & Pick<TimelineEvent, "id" | "title">): TimelineEvent {
  return {
    phaseId: "firstRender",
    phaseTitle: "First render",
    timeMs: 0,
    detail: "",
    status: "measured",
    hasTimestamp: true,
    kind: "marker",
    evidence: [],
    ...partial,
  };
}

describe("timelineToMarkdown", () => {
  it("formats a timeline as chronological markdown for LLM review", () => {
    const timeline: PageLoadTimeline = {
      label: "Mobile",
      axisEndMs: 5000,
      simulationLabel: "Slow 4G",
      events: [
        event({
          id: "nav",
          phaseId: "navigation",
          phaseTitle: "Navigation",
          title: "Navigation start",
          timeMs: 0,
          detail: "Browser begins navigation.",
          isPhaseStart: true,
        }),
        event({
          id: "doc",
          phaseId: "requestResponse",
          phaseTitle: "Request / response",
          title: "Document request",
          timeMs: 220,
          startMs: 5,
          detail: "HTML document downloaded.",
          kind: "blocking",
          waterfall: [
            {
              id: "doc-bar",
              label: "https://example.com/",
              href: "https://example.com/",
              startMs: 5,
              endMs: 220,
              resourceType: "Document",
              renderBlocking: "blocking",
              priority: "VeryHigh",
            },
          ],
          notes: [
            {
              id: "ttfb",
              title: "TTFB",
              detail: "200 ms",
              status: "measured",
              kind: "cwv",
              rating: "good",
              timeMs: 200,
            },
          ],
          isPhaseStart: true,
        }),
        event({
          id: "lcp",
          phaseId: "firstRender",
          phaseTitle: "First render",
          title: "Largest Contentful Paint",
          timeMs: 2500,
          detail: "Largest image painted.",
          kind: "cwv",
          rating: "poor",
          evidence: ["hero.png"],
          lcpSegments: [
            {
              subpart: "ttfb",
              label: "Time to first byte",
              durationMs: 200,
              startMs: 0,
              endMs: 200,
            },
            {
              subpart: "loadDelay",
              label: "Resource load delay",
              durationMs: 800,
              startMs: 200,
              endMs: 1000,
            },
          ],
          table: {
            headers: [{ text: "URL" }, { text: "Size", align: "end" }],
            rows: [[{ text: "hero.png", href: "https://example.com/hero.png" }, { text: "20 KiB" }]],
          },
          isPhaseStart: true,
        }),
      ],
    };

    expect(timelineToMarkdown(timeline)).toBe(
      [
        "# Page load timeline — Mobile",
        "Times include simulated Slow 4G",
        "Axis end: 5.00 s",
        "",
        "## Navigation · 0 ms",
        "",
        "### Navigation start · 0 ms",
        "Browser begins navigation.",
        "",
        "## Request / response · 5 ms",
        "",
        "### Document request · 5 ms–220 ms · blocking",
        "HTML document downloaded.",
        "",
        "- Requests:",
        "  - `https://example.com/` · Document · 5 ms–220 ms · blocking · priority VeryHigh",
        "",
        "- Notes:",
        "  - TTFB · 200 ms · good — 200 ms",
        "",
        "## First render · 2.50 s",
        "",
        "### Largest Contentful Paint · 2.50 s · poor · cwv",
        "Largest image painted.",
        "",
        "- Evidence: hero.png",
        "",
        "| URL | Size |",
        "| --- | --- |",
        "| hero.png | 20 KiB |",
        "",
        "- LCP breakdown:",
        "  - Time to first byte · 200 ms (0 ms–200 ms)",
        "  - Resource load delay · 800 ms (200 ms–1.00 s)",
      ].join("\n"),
    );
  });

  it("returns a short empty message when there are no events", () => {
    expect(
      timelineToMarkdown({
        label: "Desktop",
        axisEndMs: 0,
        events: [],
      }),
    ).toBe("# Page load timeline — Desktop\n\nNo timeline events.");
  });
});
