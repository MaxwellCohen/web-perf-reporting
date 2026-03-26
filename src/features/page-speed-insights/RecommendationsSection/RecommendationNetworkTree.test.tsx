import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecommendationNetworkTree } from "@/features/page-speed-insights/RecommendationsSection/RecommendationNetworkTree";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";

vi.mock("@/components/ui/tree-view", () => ({
  TreeView: ({ data }: { data: unknown[] }) => (
    <div data-testid="tree-view">{data.length} nodes</div>
  ),
}));

vi.mock("@/components/ui/accordion", () => ({
  Details: ({ children }: { children: React.ReactNode }) => <details>{children}</details>,
}));

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderTableValue", () => ({
  renderTimeValue: (ms: number) => `${ms} ms`,
}));

vi.mock("@/features/page-speed-insights/RecommendationsSection/utils", () => ({
  formatBytes: (n: number) => `${n} B`,
}));

vi.mock("@/features/page-speed-insights/RecommendationsSection/recommendationHelpers", () => ({
  isNetworkDependencyTreeRecommendation: vi.fn((id: string) => id === "network-dependency-tree"),
}));

const baseRec: Recommendation = {
  id: "unused-css",
  title: "Test",
  description: "",
  priority: "high",
  category: "Performance",
  impact: {},
  actionableSteps: [],
};

describe("RecommendationNetworkTree", () => {
  it("returns null when not network-dependency-tree recommendation", () => {
    const { container } = render(
      <RecommendationNetworkTree recommendation={baseRec} insightsItems={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when no network trees in insights", () => {
    const rec: Recommendation = {
      ...baseRec,
      id: "network-dependency-tree",
      actionableSteps: [{ step: "Fix", reports: ["Mobile"] }],
    };
    const items = [
      {
        label: "Mobile",
        item: {
          lighthouseResult: {
            audits: {
              "network-dependency-tree-insight": { details: { type: "list", items: [] } },
            },
          },
        },
      },
    ];
    const { container } = render(
      <RecommendationNetworkTree recommendation={rec} insightsItems={items as any} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders tree when network-tree data present", () => {
    const rec: Recommendation = {
      ...baseRec,
      id: "network-dependency-tree",
      actionableSteps: [{ step: "Fix", reports: ["Mobile"] }],
    };
    const items = [
      {
        label: "Mobile",
        item: {
          lighthouseResult: {
            audits: {
              "network-dependency-tree-insight": {
                details: {
                  type: "list",
                  items: [
                    {
                      value: {
                        type: "network-tree",
                        chains: {
                          "1": {
                            url: "https://example.com",
                            transferSize: 1024,
                            children: {},
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    ];
    const { container } = render(
      <RecommendationNetworkTree recommendation={rec} insightsItems={items as any} />,
    );
    expect(container.querySelector('[data-testid="tree-view"]')).toBeTruthy();
    expect(container.textContent).toContain("Network Dependency Tree");
  });
});
