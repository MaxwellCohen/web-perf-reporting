import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DetailTableSeparatePerReport } from "@/features/page-speed-insights/lh-categories/table/DetailTableSeparatePerReport";

vi.mock("@/features/page-speed-insights/tanstack-table-v9/DataTableHeader", () => ({
  DataTableHeader: () => <thead data-testid="data-table-header" />,
}));

vi.mock("@/features/page-speed-insights/tanstack-table-v9/DataTableBody", () => ({
  DataTableBody: () => <tbody data-testid="data-table-body" />,
}));

const createMockRow = (reportLabel: string, itemCount: number) => ({
  _userLabel: reportLabel,
  auditResult: {
    id: "test-audit",
    details: {
      type: "table",
      headings: [{ key: "name", valueType: "text", label: "Name" }],
      items: Array.from({ length: itemCount }, (_, i) => ({ name: `Item ${i}` })),
    },
  },
});

describe("DetailTableSeparatePerReport", () => {
  it("renders accordion with one item per report", () => {
    const rows = [createMockRow("Desktop", 2), createMockRow("Mobile", 1)];
    const { container } = render(
      <DetailTableSeparatePerReport rows={rows as any} title="DOM Size" />,
    );
    expect(container.textContent).toContain("Device");
    expect(container.textContent).toContain("Desktop");
    expect(container.textContent).toContain("Mobile");
  });

  it("renders report titles with item count", () => {
    const rows = [createMockRow("Desktop", 3)];
    const { container } = render(<DetailTableSeparatePerReport rows={rows as any} title="Test" />);
    expect(container.textContent).toMatch(/Desktop|3/);
  });

  it("renders accordion items for each report", () => {
    const rows = [createMockRow("Mobile", 1)];
    const { container } = render(<DetailTableSeparatePerReport rows={rows as any} title="Audit" />);
    expect(container.textContent).toContain("1 item");
    expect(container.textContent).toContain("Mobile");
  });

  it("shows run and device separately for run-prefixed labels", () => {
    const rows = [createMockRow("link · Desktop", 1), createMockRow("link · Mobile", 1)];
    const { getAllByText } = render(
      <DetailTableSeparatePerReport rows={rows as any} title="Cache" />,
    );
    expect(getAllByText("Run")).toHaveLength(2);
    expect(getAllByText("link")).toHaveLength(2);
    expect(getAllByText("Desktop")).toHaveLength(1);
    expect(getAllByText("Mobile")).toHaveLength(1);
  });
});
