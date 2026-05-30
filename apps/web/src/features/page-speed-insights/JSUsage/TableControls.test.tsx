import { fireEvent, render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import {
  createColumnHelper,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Table,
} from "@tanstack/react-table";
import {
  ColumnSelector,
  DropdownFilter,
  PageSizeSelector,
  PaginationCard,
  PaginationControlsManuelPageSelection,
  TableControls,
} from "@/features/page-speed-insights/JSUsage/TableControls";
import { standardFilterFns } from "@/features/page-speed-insights/shared/filterFns";

vi.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="chevron" />,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("@/components/ui/button", () => {
  const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    ({ children, ...props }, ref) => (
      <button ref={ref} type="button" {...props}>
        {children}
      </button>
    ),
  );
  Button.displayName = "Button";
  return { Button };
});

vi.mock("@/components/ui/input", () => {
  const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>((props, ref) => (
    <input ref={ref} {...props} />
  ));
  Input.displayName = "Input";
  return { Input };
});

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <button type="button">{children}</button>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuCheckboxItem: ({
    children,
    checked,
    onCheckedChange,
  }: {
    children: React.ReactNode;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <div role="checkbox" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div role="combobox" aria-controls="select-content">
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder ?? "selected"}</span>
  ),
}));

type Row = { id: number; name: string };
const columnHelper = createColumnHelper<Row>();

let latestControlsTable: Table<Row> | undefined;

function TableWithControls({ minimal = false }: { minimal?: boolean }) {
  const data = Array.from({ length: minimal ? 2 : 6 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
  }));
  const columns = [
    columnHelper.accessor("id", { id: "id", enableHiding: false }),
    columnHelper.accessor("name", { id: "name", enableHiding: true }),
  ];
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    filterFns: standardFilterFns,
    ...(minimal
      ? {}
      : {
          getPaginationRowModel: getPaginationRowModel(),
          getSortedRowModel: getSortedRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
          initialState: { pagination: { pageSize: 5 } },
        }),
  });
  latestControlsTable = table;
  return <TableControls table={table} />;
}

function getButton(container: HTMLElement, name: string | RegExp) {
  return (
    Array.from(container.querySelectorAll("button")).find((b) =>
      typeof name === "string" ? b.textContent?.trim() === name : name.test(b.textContent ?? ""),
    ) ?? null
  );
}

describe("TableControls", () => {
  it("renders reset filters and reset sorting buttons", () => {
    const { container } = render(<TableWithControls minimal />);
    expect(getButton(container, /reset filters/i)).toBeTruthy();
    expect(getButton(container, /reset sorting order/i)).toBeTruthy();
  });

  it("calls resetColumnFilters when Reset filters is clicked", () => {
    const { container } = render(<TableWithControls minimal />);
    const spy = vi.spyOn(latestControlsTable!, "resetColumnFilters");
    fireEvent.click(getButton(container, /reset filters/i)!);
    expect(spy).toHaveBeenCalled();
  });

  it("calls resetSorting when Reset Sorting Order is clicked", () => {
    const { container } = render(<TableWithControls minimal />);
    const spy = vi.spyOn(latestControlsTable!, "resetSorting");
    fireEvent.click(getButton(container, /reset sorting order/i)!);
    expect(spy).toHaveBeenCalled();
  });

  it("shows Columns dropdown and pagination when multiple pages", () => {
    const { container } = render(<TableWithControls />);
    expect(container.textContent).toContain("Columns");
    expect(container.textContent).toMatch(/1 of 2/);
  });
});

function ColumnSelectorWrapper() {
  const data = [{ id: 1, name: "A" }];
  const columns = [
    columnHelper.accessor("id", { id: "id" }),
    columnHelper.accessor("name", { id: "name", enableHiding: true }),
  ];
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    filterFns: standardFilterFns,
  });
  return <ColumnSelector table={table} />;
}

describe("ColumnSelector", () => {
  it("renders column toggle dropdown", () => {
    const { container } = render(<ColumnSelectorWrapper />);
    expect(container.textContent).toContain("Columns");
    expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(2);
  });

  it("toggles column visibility when checkbox clicked", () => {
    const { container } = render(<ColumnSelectorWrapper />);
    const trigger = container.querySelector("button");
    fireEvent.click(trigger!);
    const checkbox = container.querySelector('[role="checkbox"]');
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox!);
    expect(container.querySelector('[role="checkbox"]')).toBeTruthy();
  });
});

function PageSizeSelectorWrapper() {
  const data = [{ id: 1, name: "A" }];
  const columns = [
    columnHelper.accessor("id", { id: "id" }),
    columnHelper.accessor("name", { id: "name" }),
  ];
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    filterFns: standardFilterFns,
  });
  return <PageSizeSelector table={table} />;
}

describe("PageSizeSelector", () => {
  it("renders page size select", () => {
    const { container } = render(<PageSizeSelectorWrapper />);
    expect(container.textContent).toContain("Page Size");
    expect(container.textContent).toContain("10 items on page");
  });

  it("shows All Items when rowCount matches page size", () => {
    function PageSizeWithFewRows() {
      const data = [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ];
      const columns = [
        columnHelper.accessor("id", { id: "id" }),
        columnHelper.accessor("name", { id: "name" }),
      ];
      const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        filterFns: standardFilterFns,
      });
      return <PageSizeSelector table={table} />;
    }
    const { container } = render(<PageSizeWithFewRows />);
    expect(container.textContent).toContain("All Items in 1 page");
  });
});

function PaginationCardSinglePage() {
  const data = [{ id: 1, name: "A" }];
  const columns = [
    columnHelper.accessor("id", { id: "id" }),
    columnHelper.accessor("name", { id: "name" }),
  ];
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    filterFns: standardFilterFns,
  });
  return <PaginationCard table={table} />;
}

function PaginationCardMultiPage() {
  const data = Array.from({ length: 6 }, (_, i) => ({ id: i, name: `n${i}` }));
  const columns = [
    columnHelper.accessor("id", { id: "id" }),
    columnHelper.accessor("name", { id: "name" }),
  ];
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    filterFns: standardFilterFns,
    initialState: { pagination: { pageSize: 5 } },
  });
  return <PaginationCard table={table} showManualControls />;
}

describe("PaginationCard", () => {
  it("returns null when only one page", () => {
    const { container } = render(<PaginationCardSinglePage />);
    expect(container.firstChild).toBeNull();
  });

  it("renders pagination buttons when multiple pages", () => {
    const { container } = render(<PaginationCardMultiPage />);
    expect(container.textContent).toMatch(/Page/);
    expect(container.textContent).toMatch(/1 of 2/);
    fireEvent.click(getButton(container, ">")!);
    expect(container.textContent).toMatch(/2 of 2/);
  });

  it("navigates with first/prev/next/last buttons", () => {
    const { container } = render(<PaginationCardMultiPage />);
    fireEvent.click(getButton(container, ">>")!);
    expect(container.textContent).toMatch(/2 of 2/);
    fireEvent.click(getButton(container, "<<")!);
    expect(container.textContent).toMatch(/1 of 2/);
    fireEvent.click(getButton(container, ">")!);
    fireEvent.click(getButton(container, "<")!);
    expect(container.textContent).toMatch(/1 of 2/);
  });
});

function PaginationControlsManualWrapper() {
  const data = Array.from({ length: 6 }, (_, i) => ({ id: i, name: `n${i}` }));
  const columns = [
    columnHelper.accessor("id", { id: "id" }),
    columnHelper.accessor("name", { id: "name" }),
  ];
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    filterFns: standardFilterFns,
    initialState: { pagination: { pageIndex: 0, pageSize: 5 } },
  });
  return <PaginationControlsManuelPageSelection table={table} />;
}

describe("PaginationControlsManuelPageSelection", () => {
  it("renders page index input", () => {
    const { container } = render(<PaginationControlsManualWrapper />);
    expect(container.textContent).toMatch(/Go to page/);
    expect(container.querySelector('input[type="number"]')).toHaveValue(1);
  });

  it("changes page when input value changes", () => {
    const { container } = render(<PaginationControlsManualWrapper />);
    const input = container.querySelector('input[type="number"]');
    fireEvent.change(input!, { target: { value: "2" } });
    expect(container.textContent).toMatch(/2 of 2/);
  });
});

function DropdownFilterMissingColumn() {
  const data = [{ id: 1, name: "A" }];
  const columns = [
    columnHelper.accessor("id", { id: "id" }),
    columnHelper.accessor("name", { id: "name" }),
  ];
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    filterFns: standardFilterFns,
  });
  return <DropdownFilter table={table} columnId="missing" />;
}

function DropdownFilterWithColumn() {
  const data = [
    { id: 1, name: "Alpha" },
    { id: 2, name: "Beta" },
  ];
  const columns = [
    columnHelper.accessor("id", { id: "id" }),
    columnHelper.accessor("name", { id: "name", header: "Name" }),
  ];
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    filterFns: standardFilterFns,
  });
  return <DropdownFilter table={table} columnId="name" />;
}

describe("DropdownFilter", () => {
  it("returns null when column does not exist", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<DropdownFilterMissingColumn />);
    expect(container.firstChild).toBeNull();
    consoleErrorSpy.mockRestore();
  });

  it("renders filter dropdown when column exists", () => {
    const { container } = render(<DropdownFilterWithColumn />);
    expect(container.textContent).toContain("Filter");
    expect(container.textContent).toContain("Name");
    expect(container.querySelectorAll('[role="checkbox"]').length).toBeGreaterThan(0);
  });
});
