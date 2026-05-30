import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecommendationIssuesSection } from "@/features/page-speed-insights/RecommendationsSection/RecommendationIssuesSection";
import type { Recommendation } from "@/features/page-speed-insights/RecommendationsSection/types";

vi.mock("@/features/page-speed-insights/RecommendationsSection/IssuesFoundTable", () => ({
  IssuesFoundTable: ({
    headings,
    items,
    device,
  }: {
    headings: unknown[];
    items: unknown[];
    device: string;
  }) => (
    <div data-testid="issues-table" data-device={device}>
      {headings.length} cols, {items.length} rows
    </div>
  ),
}));

vi.mock("@/features/page-speed-insights/auditTableConfig", () => ({
  shouldShowSeparateTablesPerReport: vi.fn(() => false),
}));

const baseRec: Recommendation = {
  id: "test",
  title: "Test",
  description: "",
  priority: "high",
  category: "Performance",
  impact: {},
  actionableSteps: [],
};

describe("RecommendationIssuesSection", () => {
  it("returns null when no tableData", () => {
    const { container } = render(
      <RecommendationIssuesSection recommendation={baseRec} reportLabels={["Mobile"]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when tableData items empty", () => {
    const rec: Recommendation = {
      ...baseRec,
      tableData: { headings: [{ key: "url", label: "URL", valueType: "url" }], items: [] },
    };
    const { container } = render(
      <RecommendationIssuesSection recommendation={rec} reportLabels={["Mobile"]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders single IssuesFoundTable when items exist", () => {
    const rec: Recommendation = {
      ...baseRec,
      tableData: {
        headings: [{ key: "url", label: "URL", valueType: "url" }],
        items: [{ url: "https://example.com" }],
      },
    };
    const { container } = render(
      <RecommendationIssuesSection recommendation={rec} reportLabels={["Mobile"]} />,
    );
    expect(container.querySelector('[data-testid="issues-table"]')).toBeTruthy();
    expect(container.textContent).toContain("Issues Found");
  });

  it("renders separate tables per report when itemsByReport", async () => {
    const { shouldShowSeparateTablesPerReport } =
      await import("@/features/page-speed-insights/auditTableConfig");
    vi.mocked(shouldShowSeparateTablesPerReport).mockReturnValue(true);
    const rec: Recommendation = {
      ...baseRec,
      tableData: {
        headings: [{ key: "url", label: "URL", valueType: "url" }],
        items: [],
        itemsByReport: new Map([
          ["Mobile", [{ url: "https://m.example.com" }]],
          ["Desktop", [{ url: "https://d.example.com" }]],
        ]),
      },
    };
    const { container } = render(
      <RecommendationIssuesSection recommendation={rec} reportLabels={["Mobile", "Desktop"]} />,
    );
    expect(container.querySelectorAll('[data-testid="issues-table"]')).toHaveLength(2);
  });
});
