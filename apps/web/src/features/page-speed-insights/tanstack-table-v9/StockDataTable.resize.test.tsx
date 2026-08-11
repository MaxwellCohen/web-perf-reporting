import { describe, expect, it } from "vitest";
import { act, render, renderHook } from "@testing-library/react";
import { StockDataTable } from "@/features/page-speed-insights/tanstack-table-v9/StockDataTable";
import {
  useSimpleTable,
  type FlatColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useSimpleTable";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";

type Row = { name: string; value: number };

const columnHelper = createStockColumnHelper<Row>();
const columns = [
  columnHelper.accessor("name", {
    id: "name",
    header: "Name",
    enableResizing: true,
    size: 200,
    minSize: 80,
  }),
  columnHelper.accessor("value", {
    id: "value",
    header: "Value",
    enableResizing: true,
    size: 120,
    minSize: 60,
  }),
] as FlatColumnDef<Row>[];

const data: Row[] = [
  { name: "alpha", value: 1 },
  { name: "beta", value: 2 },
];

describe("StockDataTable column resize", () => {
  it("sizes the table to the sum of column sizes", () => {
    const { result } = renderHook(() => useSimpleTable({ data, columns }));
    const { container } = render(<StockDataTable table={result.current} showCopy={false} />);

    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    expect(table?.style.width).toBe(`${result.current.getTotalSize()}px`);
  });

  it("updates only the resized column width", () => {
    const { result } = renderHook(() => useSimpleTable({ data, columns }));
    const { container, rerender } = render(
      <StockDataTable table={result.current} showCopy={false} />,
    );

    const nameBefore = result.current.getColumn("name")!.getSize();
    const valueBefore = result.current.getColumn("value")!.getSize();

    act(() => {
      result.current.setColumnSizing({ name: 320 });
    });

    rerender(<StockDataTable table={result.current} showCopy={false} />);

    expect(result.current.getColumn("name")!.getSize()).toBe(320);
    expect(result.current.getColumn("value")!.getSize()).toBe(valueBefore);
    expect(result.current.getColumn("name")!.getSize()).not.toBe(nameBefore);

    const headers = container.querySelectorAll("th");
    const nameHeader = Array.from(headers).find((th) => th.textContent?.includes("Name"));
    const valueHeader = Array.from(headers).find((th) => th.textContent?.includes("Value"));
    expect(nameHeader?.style.width).toBe("320px");
    expect(nameHeader?.style.minWidth).toBe("320px");
    expect(nameHeader?.style.maxWidth).toBe("320px");
    expect(valueHeader?.style.width).toBe(`${valueBefore}px`);
    expect(valueHeader?.style.minWidth).toBe(`${valueBefore}px`);
    expect(valueHeader?.style.maxWidth).toBe(`${valueBefore}px`);
  });

  it("updates table width when a column is resized", () => {
    const { result } = renderHook(() => useSimpleTable({ data, columns }));
    const { container, rerender } = render(
      <StockDataTable table={result.current} showCopy={false} />,
    );

    const before = result.current.getTotalSize();

    act(() => {
      result.current.setColumnSizing({ name: 320 });
    });

    rerender(<StockDataTable table={result.current} showCopy={false} />);

    const table = container.querySelector("table");
    const after = result.current.getTotalSize();
    expect(after).toBeGreaterThan(before);
    expect(table?.style.width).toBe(`${after}px`);
  });

  it("renders a column resize handle on resizable headers", () => {
    const { result } = renderHook(() => useSimpleTable({ data, columns }));
    const { container } = render(<StockDataTable table={result.current} showCopy={false} />);

    const resizers = container.querySelectorAll(".cursor-col-resize");
    expect(resizers.length).toBeGreaterThan(0);
  });
});
