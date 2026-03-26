import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/page-speed-insights/shared/TableCard", () => ({
  TableCard: ({ title }: { title: string }) => <div data-testid="table-card">{title}</div>,
}));

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderTableValue", () => ({
  RenderMSValue: ({ value }: { value: number }) => <span>{value} ms</span>,
}));

vi.mock("@/features/page-speed-insights/shared/tableConfigHelpers", () => ({
  useStandardTable: () => ({
    getHeaderGroups: () => [],
    getRowModel: () => ({ rows: [] }),
    getRowCount: () => 0,
  }),
}));

vi.mock("@/features/page-speed-insights/shared/useTableColumns", () => ({
  useTableColumns: () => [],
}));

import { MainThreadWorkCard } from "@/features/page-speed-insights/javascript-metrics/MainThreadWorkCard";

describe("MainThreadWorkCard", () => {
  it("returns null when no metrics have mainThreadWork items", () => {
    const { container } = render(
      <MainThreadWorkCard
        metrics={[
          { label: "Mobile", mainThreadWork: [] },
          { label: "Desktop", mainThreadWork: [] },
        ]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders card with table when data present", () => {
    const { container } = render(
      <MainThreadWorkCard
        metrics={[
          {
            label: "Mobile",
            mainThreadWork: [
              {
                group: "scripting",
                groupLabel: "Scripting",
                duration: 150,
              },
            ] as any,
          },
        ]}
      />,
    );
    expect(container.querySelector('[data-testid="table-card"]')).toBeTruthy();
    expect(container.textContent).toContain("Main Thread Work Breakdown");
  });
});
