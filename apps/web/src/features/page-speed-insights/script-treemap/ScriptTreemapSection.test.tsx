import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Accordion } from "@/components/ui/accordion";
import { ScriptTreemapSection } from "@/features/page-speed-insights/script-treemap/ScriptTreemapSection";

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

vi.mock("@/features/page-speed-insights/script-treemap/ScriptTreemapChartCard", () => ({
  ScriptTreemapChartCard: ({ label }: { label?: string }) => (
    <div data-testid="script-treemap-chart">{label}</div>
  ),
}));

vi.mock("@/features/page-speed-insights/JSUsage/JSUsageTable", () => ({
  JSUsageTableWithControls: () => <div data-testid="js-usage-table">table</div>,
}));

import { useScriptTreemapItems } from "@/features/page-speed-insights/script-treemap/useScriptTreemapItems";

function renderSection() {
  return render(
    <Accordion type="multiple" defaultValue={["scriptTreemap"]}>
      <ScriptTreemapSection />
    </Accordion>,
  );
}

describe("ScriptTreemapSection", () => {
  it("returns null when no treemap data", () => {
    vi.mocked(useScriptTreemapItems).mockReturnValue([]);
    const { container } = renderSection();
    expect(container.querySelector('[data-testid="script-treemap-chart"]')).toBeNull();
    expect(screen.queryByText("Script Treemap")).toBeNull();
  });

  it("renders chart and table when treemap data exists", () => {
    vi.mocked(useScriptTreemapItems).mockReturnValue([
      { label: "Mobile", treeData: mockTreeData },
    ]);

    renderSection();

    expect(screen.getByText("Script Treemap")).toBeTruthy();
    expect(screen.getByTestId("script-treemap-chart")).toHaveTextContent("Mobile");
    expect(screen.getByTestId("js-usage-table")).toBeTruthy();
    expect(screen.getByText("JS Usage Table (Mobile)")).toBeTruthy();
  });
});
