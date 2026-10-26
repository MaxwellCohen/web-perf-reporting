import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const usePageSpeedItemsMock = vi.fn();

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: () => usePageSpeedItemsMock(),
}));

vi.mock("@/features/page-speed-insights/dashboard-view/reportScoreSummary", () => ({
  formatScore: (score: number | null) => (score == null ? "–" : String(Math.round(score * 100))),
  scoreToneColor: () => "green",
  summarizeReport: ({ label }: { label: string }) => ({
    label,
    performance: { id: "performance", title: "Performance", score: 0.9 },
    otherCategories: [],
    metrics: [],
  }),
}));

import { ReportScoreOverview } from "@/features/page-speed-insights/dashboard-view/ReportScoreOverview";

describe("ReportScoreOverview", () => {
  beforeEach(() => {
    usePageSpeedItemsMock.mockReset();
  });

  it("renders a side-by-side compare layout for dual runs", () => {
    usePageSpeedItemsMock.mockReturnValue([
      { label: "A · Mobile", item: { lighthouseResult: {} } },
      { label: "B · Mobile", item: { lighthouseResult: {} } },
    ]);

    const { container } = render(<ReportScoreOverview />);
    expect(container.querySelector('[data-testid="score-compare"]')).toBeTruthy();
    expect(container.textContent).toContain("A");
    expect(container.textContent).toContain("B");
    expect(container.querySelectorAll('[data-testid="report-score-card"]')).toHaveLength(2);
  });
});
