import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JSUsageAccordion } from "@/features/page-speed-insights/JSUsage/JSUsageSection";

const mockTreeData = {
  type: "treemap-data" as const,
  nodes: [
    {
      name: "https://example.com/script.js",
      resourceBytes: 50000,
      unusedBytes: 10000,
      children: [],
    },
  ],
};

vi.mock("@/features/page-speed-insights/JSUsage/JSUsageTable", () => ({
  JSUsageTableWithControls: ({ data }: { data: unknown[] }) => (
    <div data-testid="js-usage-table">Table rows: {data.length}</div>
  ),
}));

describe("JSUsageAccordion", () => {
  it("renders accordion with table", () => {
    render(<JSUsageAccordion treeData={mockTreeData as any} label="Desktop" />);
    expect(screen.getByTestId("js-usage-table")).toHaveTextContent("Table rows: 1");
    expect(screen.getByText(/JS Usage Table\s*for Desktop/)).toBeInTheDocument();
  });
});
