import { render } from "@testing-library/react";
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

vi.mock("@/features/page-speed-insights/script-treemap/useScriptTreemapItems", () => ({
  useScriptTreemapItems: vi.fn(() => []),
}));

vi.mock("@/features/page-speed-insights/JSUsage/JSUsageTable", () => ({
  JSUsageTableWithControls: ({ data }: { data: unknown[] }) => (
    <div data-testid="js-usage-table">Table rows: {data.length}</div>
  ),
}));

import { useScriptTreemapItems } from "@/features/page-speed-insights/script-treemap/useScriptTreemapItems";

describe("JSUsageAccordion", () => {
  it("renders accordion with table", () => {
    const { container } = render(
      <JSUsageAccordion treeData={mockTreeData as any} label="Desktop" />,
    );
    expect(container.querySelector('[data-testid="js-usage-table"]')).toBeTruthy();
    expect(container.firstChild).toMatchSnapshot();
  });
});
