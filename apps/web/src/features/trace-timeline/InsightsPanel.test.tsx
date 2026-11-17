import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InsightsPanel } from "./InsightsPanel";
import type { InpInsight, TraceInsights } from "./insights";

type InteractionBreakdown = InpInsight["longest"];

const interaction = (
  interactionId: number,
  type: string,
  target: string,
  durationMs: number,
): InteractionBreakdown => ({
  type,
  target,
  interactionId,
  startMs: 1000 * interactionId,
  durationMs,
  inputDelayMs: 10,
  processingMs: 100,
  presentationMs: durationMs - 110,
  rating: "needs-improvement",
});

const first = interaction(1, "click", "BUTTON", 320);
const second = interaction(2, "keydown", "INPUT", 250);

const full = (lcpUrl = "https://cdn.test/hero.png"): TraceInsights => ({
  lcp: {
    timeMs: 2600,
    rating: "needs-improvement",
    element: "IMG (image)",
    url: lcpUrl,
    subparts: [
      { key: "ttfb", label: "Time to first byte", ms: 200 },
      { key: "loadDelay", label: "Resource load delay", ms: 800 },
      { key: "loadDuration", label: "Resource load duration", ms: 300 },
      { key: "renderDelay", label: "Element render delay", ms: 1300 },
    ],
  },
  inp: {
    valueMs: 320,
    rating: "needs-improvement",
    count: 2,
    longest: first,
    interactions: [first, second],
  },
  cls: {
    score: 0.12,
    rating: "needs-improvement",
    clusters: [{ startMs: 1200, endMs: 2500, score: 0.12, shifts: 3, nodes: ["IMG", "P"] }],
  },
  renderBlocking: [
    {
      url: "https://x.test/a.css",
      startMs: 100,
      endMs: 400,
      durationMs: 300,
      transferBytes: 2048,
      type: "Stylesheet",
    },
  ],
  thirdParties: [
    { origin: "https://busy.test", requests: 3, transferBytes: 4096, mainThreadMs: 450 },
    { origin: "https://idle.test", requests: 1, transferBytes: 100, mainThreadMs: 0 },
  ],
});

describe("InsightsPanel", () => {
  it("renders every insight section", () => {
    render(<InsightsPanel insights={full()} />);
    expect(screen.getByRole("region", { name: "Performance insights" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Insights" })).toBeTruthy();
    for (const name of [
      "LCP breakdown",
      "INP breakdown",
      "CLS session windows",
      "Render-blocking resources",
      "Third parties",
    ]) {
      expect(screen.getByRole("heading", { level: 3, name })).toBeTruthy();
    }
    expect(screen.getAllByText("needs improvement")).toHaveLength(3);
    expect(screen.getByRole("img", { name: /Time to first byte/ })).toBeTruthy();
    const link = screen.getByRole("link") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("https://cdn.test/hero.png");
    expect(screen.getByText("click · BUTTON")).toBeTruthy();
    expect(screen.getByText("keydown · INPUT")).toBeTruthy();

    const busy = screen.getByText("https://busy.test").closest("tr") as HTMLElement;
    expect(within(busy).getByText("450 ms")).toBeTruthy();
    const idle = screen.getByText("https://idle.test").closest("tr") as HTMLElement;
    expect(within(idle).getByText("—")).toBeTruthy();
  });

  it("does not link an LCP resource that is not http(s)", () => {
    render(<InsightsPanel insights={full("data:image/png;base64,AAAA")} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("/…/png;base64,AAAA")).toBeTruthy();
  });

  it("renders nothing when there are no insights", () => {
    const { container } = render(
      <InsightsPanel
        insights={{
          cls: { score: 0, rating: "good", clusters: [] },
          renderBlocking: [],
          thirdParties: [],
        }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
