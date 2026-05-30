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
  renderTimeValue: (v: unknown) => <span data-testid="time">{String(v)}</span>,
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
});
