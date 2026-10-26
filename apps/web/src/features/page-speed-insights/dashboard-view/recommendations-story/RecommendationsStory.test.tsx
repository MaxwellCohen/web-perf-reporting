import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";

let items: InsightsContextItem[] = [];
let mockRecommendations: Recommendation[] = [];
let searchState = {
  categories: [] as string[],
  priorities: [] as string[],
  expanded: [] as string[],
};
const patchDashboardSearch = vi.fn();

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: () => items,
}));

vi.mock("@/features/page-speed-insights/dashboard-view/useDashboardSearch", () => ({
  useDashboardSearchState: () => searchState,
}));

vi.mock("@/features/page-speed-insights/dashboard-view/dashboardSearch", () => ({
  patchDashboardSearch: (patch: Record<string, unknown>) => patchDashboardSearch(patch),
}));

vi.mock("@/features/page-speed-insights/RecommendationsSection/analyzeAudits", () => ({
  analyzeAudits: () => mockRecommendations,
  hasDetails: () => true,
}));

vi.mock("@/features/page-speed-insights/RecommendationsSection/RecommendationItem", () => ({
  RecommendationItem: ({ rec }: { rec: { title: string } }) => <div>{rec.title}</div>,
}));

vi.mock("@/features/page-speed-insights/RecommendationsSection/FilterControls", () => ({
  FilterControls: () => <div>Filters</div>,
}));

import { RecommendationsStory } from "@/features/page-speed-insights/dashboard-view/recommendations-story/RecommendationsStory";

function sampleRecommendations(): Recommendation[] {
  return [
    {
      id: "render-blocking-resources-mobile",
      title: "Eliminate render-blocking resources",
      description: "Defer CSS",
      priority: "high",
      category: "Performance",
      impact: { savings: 800, unit: "ms", metric: "LCP" },
      actionableSteps: [],
    },
    {
      id: "unused-javascript-mobile",
      title: "Reduce unused JavaScript",
      description: "Trim JS",
      priority: "medium",
      category: "Performance",
      impact: { savings: 120 * 1024, unit: "bytes" },
      actionableSteps: [],
    },
    {
      id: "image-alt-mobile",
      title: "Image elements have alt attributes",
      description: "A11y",
      priority: "low",
      category: "Accessibility",
      impact: {},
      actionableSteps: [],
    },
  ];
}

describe("RecommendationsStory", () => {
  afterEach(() => {
    items = [];
    mockRecommendations = [];
    searchState = { categories: [], priorities: [], expanded: [] };
    patchDashboardSearch.mockClear();
  });

  it("renders lead magnitude and fix-next list", () => {
    items = [{} as InsightsContextItem];
    mockRecommendations = sampleRecommendations();
    const { container } = render(<RecommendationsStory />);

    expect(container.textContent).toContain("What to fix");
    expect(container.textContent).toContain("800 ms");
    expect(container.textContent).toContain("1 high-priority finding");
    expect(container.querySelector('[aria-label="Choose a priority"]')).toBeNull();
    expect(container.querySelector('[aria-label="Fix next"]')).toBeTruthy();
    expect(container.textContent).toContain("Eliminate render-blocking resources");
  });

  it("expands a fix-next recommendation", () => {
    items = [{} as InsightsContextItem];
    mockRecommendations = sampleRecommendations();
    const { container } = render(<RecommendationsStory />);
    const first = container.querySelector('[aria-label="Fix next"] button');

    fireEvent.click(first!);
    // Largest list ranks by raw savings value; 120 KiB > 800 ms numerically.
    expect(patchDashboardSearch).toHaveBeenCalledWith({
      expanded: ["unused-javascript-mobile"],
    });
  });

  it("shows empty copy when there are no recommendations", () => {
    items = [{} as InsightsContextItem];
    mockRecommendations = [];
    const { container } = render(<RecommendationsStory />);
    expect(container.textContent).toContain("This report has no recommendations.");
  });
});
