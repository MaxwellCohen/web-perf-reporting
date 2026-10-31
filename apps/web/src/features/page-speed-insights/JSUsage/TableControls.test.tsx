import { fireEvent, render } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import type { StockTable } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { useTable, type RowData } from "@tanstack/react-table";
import { createStockColumnHelper as createColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { standardTableFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";
import { TableControls } from "@/features/page-speed-insights/JSUsage/TableControls";
vi.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="chevron" />,
  Copy: () => <span data-testid="copy" />,
  Check: () => <span data-testid="check" />,
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
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
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

function useControlsTestTable<T extends RowData>(
  data: T[],
  columns: unknown[],
  options?: { paginated?: boolean; pageSize?: number },
) {
  return useTable({
    features: standardTableFeatures,
    data,
    columns: columns as never,
    ...(options?.paginated && {
      initialState: { pagination: { pageIndex: 0, pageSize: options.pageSize ?? 5 } },
    }),
  });
}

let latestControlsTable: StockTable<Row> | undefined;

function TableWithControls({ minimal = false }: { minimal?: boolean }) {
  const data = Array.from({ length: minimal ? 2 : 6 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
  }));
  const columns = [
    columnHelper.accessor("id", { id: "id", enableHiding: false }),
    columnHelper.accessor("name", { id: "name", enableHiding: true }),
  ];
  const table = useControlsTestTable(data, columns, minimal ? undefined : { paginated: true });
  // Test-only capture of table instance for spies. Assigned in an effect so the
  // render itself stays side-effect free (effect runs before test assertions).
  useEffect(() => {
    latestControlsTable = table as unknown as StockTable<Row>;
  }, [table]);
  return <TableControls table={table as StockTable<Row>} />;
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
    expect(getButton(container, /reset sorting/i)).toBeTruthy();
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
    fireEvent.click(getButton(container, /reset sorting/i)!);
    expect(spy).toHaveBeenCalled();
  });

  it("shows Columns dropdown and pagination when multiple pages", () => {
    const { container } = render(<TableWithControls />);
    expect(container.textContent).toContain("Columns");
    expect(container.textContent).toMatch(/1 of 2/);
  });
});
