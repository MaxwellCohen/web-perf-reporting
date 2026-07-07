import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { flexRender } from "@tanstack/react-table-v9";
import { useSimpleTable } from "@/features/page-speed-insights/tanstack-table-v9/useSimpleTable";
import { columns } from "@/features/page-speed-insights/JSUsage/jsUsageTableColumns";
import type { TreeMapNode } from "@/lib/schema";

vi.mock("@/features/page-speed-insights/JSUsage/jsUsageTableParts", () => ({
  ExpandRow: () => <span data-testid="expand-row" />,
  ExpandAll: () => <span data-testid="expand-all" />,
  RenderBytesCell: () => <span data-testid="bytes-cell" />,
}));

vi.mock("@/features/page-speed-insights/JSUsage/StatusCircle", () => ({
  StatusCircle: () => <span data-testid="status-circle" />,
}));

vi.mock("@/features/page-speed-insights/lh-categories/renderBoolean", () => ({
  renderBoolean: (v: boolean) => <span>{v ? "Yes" : "No"}</span>,
}));

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderTableValue", () => ({
  RenderBytesValue: ({ value }: { value: number }) => <span>{value} bytes</span>,
}));

const mockData: TreeMapNode[] = [
  {
    name: "https://example.com/script.js",
    resourceBytes: 50000,
    unusedBytes: 10000,
  },
  {
    name: "https://other.com/bundle.js",
    resourceBytes: 100000,
    unusedBytes: 50000,
  },
];

function TableWithNameHeader() {
  const table = useSimpleTable({ data: mockData, columns: columns as never });
  const headerGroup = table.getHeaderGroups()[0];
  const header = headerGroup.headers.find((h) => h.column.id === "name");
  if (!header) return null;
  return <div>{flexRender(header.column.columnDef.header, header.getContext())}</div>;
}

function CellRenderer({ data, columnId }: { data: TreeMapNode[]; columnId: string }) {
  const table = useSimpleTable({ data, columns: columns as never });
  const row = table.getRowModel().rows[0];
  const cell = row.getVisibleCells().find((c) => c.column.id === columnId);
  if (!cell?.column.columnDef.cell) return null;
  return (
    <table>
      <tbody>
        <tr>
          <td>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
        </tr>
      </tbody>
    </table>
  );
}

describe("jsUsageTableColumns", () => {
  describe("column headers", () => {
    it("renders plain string header for name column", () => {
      const { container } = render(<TableWithNameHeader />);
      expect(container.textContent).toContain("Name");
    });

    it("uses includesString filter for name column", () => {
      const nameColumn = columns[2];
      expect(nameColumn.filterFn).toBe("includesString");
    });

    it("uses inNumberRange filter for bytes columns", () => {
      expect(columns[5].filterFn).toBe("inNumberRange");
      expect(columns[6].filterFn).toBe("inNumberRange");
    });
  });

  describe("columns", () => {
    it("renders name cell with URL host for array value", () => {
      const { container } = render(
        <CellRenderer
          data={[{ name: ["https://foo.com/bar.js"], resourceBytes: 0 } as unknown as TreeMapNode]}
          columnId="name"
        />,
      );
      expect(container.textContent).toContain("foo.com");
    });

    it("renders Unknown for invalid URL in array", () => {
      const { container } = render(
        <CellRenderer
          data={[{ name: ["not-a-url"], resourceBytes: 0 } as unknown as TreeMapNode]}
          columnId="name"
        />,
      );
      expect(container.textContent).toContain("Unknown");
    });

    it("renders Percent cell with N/A for undefined", () => {
      const { container } = render(
        <CellRenderer data={[{ name: "x", resourceBytes: 0 } as TreeMapNode]} columnId="Percent" />,
      );
      expect(container.textContent).toContain("N/A");
    });

    it("renders Percent cell with value for valid numbers", () => {
      const { container } = render(
        <CellRenderer
          data={[{ name: "x", resourceBytes: 100, unusedBytes: 25 } as TreeMapNode]}
          columnId="Percent"
        />,
      );
      expect(container.textContent).toMatch(/25\.00 %/);
    });
  });
});
