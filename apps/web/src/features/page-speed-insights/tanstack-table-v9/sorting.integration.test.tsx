import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useStandardTable, type StandardColumnDef } from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";

type Row = { name: string; score: number };

describe("useStandardTable sorting", () => {
  it("reorders rows when column sorting changes", () => {
    const columnHelper = createStockColumnHelper<Row>();
    const columns: StandardColumnDef<Row>[] = [
      columnHelper.accessor("name", { id: "name", header: "Name" }),
      columnHelper.accessor("score", {
        id: "score",
        header: "Score",
        sortFn: "basic",
      }),
    ];
    const data: Row[] = [
      { name: "b", score: 2 },
      { name: "a", score: 1 },
      { name: "c", score: 3 },
    ];

    const { result } = renderHook(() => useStandardTable({ data, columns, grouping: [] }));

    expect(result.current.getRowModel().rows.map((r) => r.getValue("name"))).toEqual([
      "b",
      "a",
      "c",
    ]);

    act(() => {
      result.current.getColumn("score")!.toggleSorting(false);
    });

    expect(result.current.getRowModel().rows.map((r) => r.getValue("name"))).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(result.current.getColumn("score")!.getIsSorted()).toBe("asc");

    act(() => {
      result.current.getColumn("score")!.toggleSorting(true);
    });

    expect(result.current.getRowModel().rows.map((r) => r.getValue("name"))).toEqual([
      "c",
      "b",
      "a",
    ]);
    expect(result.current.getColumn("score")!.getIsSorted()).toBe("desc");
  });
});
