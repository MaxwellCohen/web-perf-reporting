import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createStockColumnHelper as createColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { useSimpleTable } from "@/features/page-speed-insights/tanstack-table-v9/useSimpleTable";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";

vi.mock("@/features/page-speed-insights/tanstack-table-v9/DataTableHeader", () => ({
  DataTableHeader: () => (
    <thead data-testid="data-table-header">
      <tr>
        <th>Col1</th>
      </tr>
    </thead>
  ),
}));

vi.mock("@/features/page-speed-insights/tanstack-table-v9/DataTableBody", () => ({
  DataTableBody: () => (
    <tbody data-testid="data-table-body">
      <tr>
        <td>Row1</td>
      </tr>
    </tbody>
  ),
}));

vi.mock("@/features/page-speed-insights/tanstack-table-v9/PaginationCard", () => ({
  PaginationCard: () => <div data-testid="pagination-card" />,
}));

function TableCardWithTable({
  rowCount,
  showPagination,
  pageSize = 10,
}: {
  rowCount: number;
  showPagination?: boolean;
  pageSize?: number;
}) {
  const columnHelper = createColumnHelper<{ id: string }>();
  const columns = [columnHelper.accessor("id", { header: "ID" })];
  const data = Array.from({ length: rowCount }, (_, i) => ({ id: `row-${i}` }));
  const table = useSimpleTable({ data, columns: columns as never });
  return (
    <TableCard
      title="Test Table"
      table={table as never}
      showPagination={showPagination}
      pageSize={pageSize}
    />
  );
}

describe("TableCard", () => {
  it("renders title and table", () => {
    const { container } = render(<TableCardWithTable rowCount={2} />);
    expect(container.textContent).toContain("Test Table");
    expect(container.querySelector('[data-testid="data-table-header"]')).toBeTruthy();
  });

  it("shows Show all results when rowCount > pageSize and showPagination", () => {
    const { container } = render(<TableCardWithTable rowCount={15} showPagination pageSize={10} />);
    const showAllBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Show all results"),
    );
    expect(showAllBtn).toBeTruthy();
  });

  it("calls setPageSize when Show all results clicked", () => {
    const { container } = render(<TableCardWithTable rowCount={15} showPagination pageSize={10} />);
    const showAllBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Show all results"),
    );
    fireEvent.click(showAllBtn!);
    const showLessBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Show less results"),
    );
    expect(showLessBtn).toBeTruthy();
  });
});
