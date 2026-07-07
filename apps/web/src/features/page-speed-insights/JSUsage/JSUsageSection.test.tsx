import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  JSUsageSection,
  JSUsageCardSection,
  JSUsageCard,
  JSUsageAccordion,
} from "@/features/page-speed-insights/JSUsage/JSUsageSection";

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

describe("JSUsageSection", () => {
  it("returns null when no items have script-treemap-data", () => {
    vi.mocked(useScriptTreemapItems).mockReturnValue([]);
    const { container } = render(<JSUsageSection />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a card per item when items have script-treemap-data", async () => {
    vi.mocked(useScriptTreemapItems).mockReturnValue([
      { label: "Mobile", treeData: mockTreeData },
    ]);
    const { container } = render(<JSUsageSection />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe("JSUsageCardSection", () => {
  it("returns null when no treemap data", () => {
    vi.mocked(useScriptTreemapItems).mockReturnValue([]);
    const { container } = render(<JSUsageCardSection />);
    expect(container.firstChild).toBeNull();
  });

  it("renders cards when treemap data exists", () => {
    vi.mocked(useScriptTreemapItems).mockReturnValue([
      { label: "Desktop", treeData: mockTreeData },
    ]);
    const { container } = render(<JSUsageCardSection />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe("JSUsageCard", () => {
  it("renders card with label", () => {
    const { container } = render(<JSUsageCard treeData={mockTreeData as any} label="Mobile" />);
    expect(container.querySelector('[data-testid="js-usage-table"]')).toBeTruthy();
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders without label", () => {
    const { container } = render(<JSUsageCard treeData={mockTreeData as any} />);
    expect(container.querySelector('[data-testid="js-usage-table"]')).toBeTruthy();
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe("JSUsageAccordion", () => {
  it("renders accordion with table", () => {
    const { container } = render(
      <JSUsageAccordion treeData={mockTreeData as any} label="Desktop" />,
    );
    expect(container.querySelector('[data-testid="js-usage-table"]')).toBeTruthy();
    expect(container.firstChild).toMatchSnapshot();
  });
});
