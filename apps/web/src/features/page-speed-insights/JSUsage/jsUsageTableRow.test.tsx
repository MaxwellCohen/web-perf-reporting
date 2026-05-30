import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getCoreRowModel, getExpandedRowModel, useReactTable } from "@tanstack/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import { JSUsageTableRow } from "@/features/page-speed-insights/JSUsage/jsUsageTableRow";
import type { TreeMapNode } from "@/lib/schema";

vi.mock("@/components/ui/table", () => ({
  TableRow: ({
    children,
    className,
    ...props
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <tr className={className} {...props}>
      {children}
    </tr>
  ),
  TableCell: ({ children, ...props }: { children: React.ReactNode }) => (
    <td {...props}>{children}</td>
  ),
}));

vi.mock("lucide-react", () => ({
  ChevronRightIcon: () => <span data-testid="chevron" />,
}));

vi.mock("@/features/page-speed-insights/JSUsage/jsUsageTableParts", () => ({
  ExpandRow: () => <span data-testid="expand-row" />,
  RenderBytesCell: () => <span data-testid="bytes-cell" />,
}));

vi.mock("@/features/page-speed-insights/JSUsage/StatusCircle", () => ({
  StatusCircle: () => <span data-testid="status" />,
}));

vi.mock("@/features/page-speed-insights/lh-categories/renderBoolean", () => ({
  renderBoolean: () => <span>bool</span>,
}));

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderTableValue", () => ({
  RenderBytesValue: ({ value }: { value: number }) => <span>{value} B</span>,
}));

const columnHelper = createColumnHelper<TreeMapNode>();
const columns = [
  columnHelper.accessor("name", { id: "name", header: "Name", cell: (info) => info.getValue() }),
  columnHelper.accessor("resourceBytes", {
    id: "resourceBytes",
    header: "Size",
    cell: (info) => info.getValue(),
  }),
];

function TableWithRow({ data }: { data: TreeMapNode[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row) => (row.children?.length ? row.children : undefined),
    enableExpanding: true,
    filterFns: { booleanFilterFn: () => true },
  });
  const row = table.getRowModel().rows[0];
  if (!row) return null;
  return (
    <table>
      <tbody>
        <JSUsageTableRow row={row} i={0} />
      </tbody>
    </table>
  );
}

describe("JSUsageTableRow", () => {
  it("renders row with cell data", () => {
    const data: TreeMapNode[] = [{ name: "https://example.com/script.js", resourceBytes: 50000 }];
    const { container } = render(<TableWithRow data={data} />);
    expect(container.textContent).toContain("https://example.com/script.js");
    expect(container.textContent).toContain("50000");
  });

  it("renders row with children (expandable)", () => {
    const data: TreeMapNode[] = [
      {
        name: "parent",
        resourceBytes: 100,
        children: [{ name: "child", resourceBytes: 50 }],
      },
    ];
    const { container } = render(<TableWithRow data={data} />);
    expect(container.textContent).toContain("parent");
    expect(container.querySelector("tr")).toBeTruthy();
  });

  it("sets data-can-expand on cells", () => {
    const data: TreeMapNode[] = [
      {
        name: "parent",
        resourceBytes: 100,
        children: [{ name: "child", resourceBytes: 50 }],
      },
    ];
    const { container } = render(<TableWithRow data={data} />);
    const cell = container.querySelector('[data-can-expand="true"]');
    expect(cell).toBeTruthy();
  });
});
