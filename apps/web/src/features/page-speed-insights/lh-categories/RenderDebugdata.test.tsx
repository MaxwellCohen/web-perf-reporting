import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RenderDebugData } from "@/features/page-speed-insights/lh-categories/RenderDebugdata";

vi.mock("@/features/page-speed-insights/lh-categories/renderBoolean", () => ({
  renderBoolean: (v: boolean) => <span data-testid="bool">{v ? "Yes" : "No"}</span>,
}));

vi.mock("@/features/page-speed-insights/lh-categories/camelCaseToSentenceCase", () => ({
  camelCaseToSentenceCase: (s: string) => s.replace(/([A-Z])/g, " $1").trim(),
}));

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderTableValue", () => ({
  RenderBytesValue: ({ value }: { value: unknown }) => (
    <span data-testid="bytes">{String(value)}</span>
  ),
  RenderCountNumber: (v: unknown) => <span data-testid="count">{String(v)}</span>,
}));

vi.mock("@/features/page-speed-insights/shared/format", () => ({
  formatMs: (v: number) => <span data-testid="time">{String(v)}</span>,
}));

const mockTableDataItem = (details: Record<string, unknown>) => ({
  _userLabel: "Mobile",
  auditResult: { details },
  auditRef: { id: "test" },
  _category: { title: "Performance" },
});

describe("RenderDebugData", () => {
  it("renders empty table for empty items", () => {
    const { container } = render(<RenderDebugData items={[]} />);
    expect(container.querySelector("table")).toBeTruthy();
  });

  it("renders debug data from items", () => {
    const items = [
      mockTableDataItem({
        type: "debugdata",
        firstContentfulPaint: 1000,
        cumulativeLayoutShift: 0.1,
      }) as any,
    ];
    const { container } = render(<RenderDebugData items={items} />);
    expect(container.querySelector("table")).toBeTruthy();
    expect(container.textContent).toContain("First Contentful Paint");
  });

  it("renders items with nested items", () => {
    const items = [
      mockTableDataItem({
        type: "debugdata",
        items: [{ observedLcp: 500 }],
      }) as any,
    ];
    const { container } = render(<RenderDebugData items={items} />);
    expect(container.querySelector("table")).toBeTruthy();
  });

  it("flattens nested objects and keeps precision on small values", () => {
    const items = [
      mockTableDataItem({
        type: "debugdata",
        items: [
          {
            cumulativeLayoutShiftMainFrame: 0.00001561317836328782,
            newEngineResult: {
              cumulativeLayoutShift: 0.00001561317836328782,
              cumulativeLayoutShiftMainFrame: 0.00001561317836328782,
            },
            newEngineResultDiffered: false,
          },
        ],
      }) as any,
    ];
    const { container } = render(<RenderDebugData items={items} />);
    const text = container.textContent || "";
    expect(text).toMatch(/engine result › cumulative layout shift0/i);
    expect(text).toMatch(/engine result › cumulative layout shift \(main frame\)/i);
    expect(text).toContain("0.0000156");
    expect(text).not.toContain("0.00Mobile");
    expect(text).toContain("Report");
  });
});
