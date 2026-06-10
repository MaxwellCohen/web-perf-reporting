import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useStandardTable, type StandardColumnDef } from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";

type Row = { name: string; flag: boolean };

describe("useStandardTable boolean filter", () => {
  it("filters rows when boolean column filter changes", () => {
    const columnHelper = createStockColumnHelper<Row>();
    const columns: StandardColumnDef<Row>[] = [
      columnHelper.accessor("name", { id: "name", header: "Name" }),
      columnHelper.accessor("flag", {
        id: "flag",
        header: "Flag",
        // @ts-expect-error v9 custom filter key
        filterFn: "booleanFilterFn",
      }),
    ];
    const data: Row[] = [
      { name: "a", flag: true },
      { name: "b", flag: false },
      { name: "c", flag: true },
    ];

    const { result } = renderHook(() =>
      useStandardTable({ data, columns, grouping: [] }),
    );

    expect(result.current.getRowModel().rows).toHaveLength(3);

    const flagColumn = result.current.getColumn("flag");
    expect(flagColumn).toBeTruthy();

    act(() => {
      flagColumn!.setFilterValue([true]);
    });

    const names = result.current.getRowModel().rows.map((r) => r.getValue("name"));
    expect(names).toEqual(["a", "c"]);
  });

  it("filters rows when using CheckBoxFilter-style updater (uncheck false)", () => {
    const columnHelper = createStockColumnHelper<Row>();
    const columns: StandardColumnDef<Row>[] = [
      columnHelper.accessor("name", { id: "name", header: "Name" }),
      columnHelper.accessor("flag", {
        id: "flag",
        header: "Flag",
        // @ts-expect-error v9 custom filter key
        filterFn: "booleanFilterFn",
      }),
    ];
    const data: Row[] = [
      { name: "a", flag: true },
      { name: "b", flag: false },
    ];

    const { result } = renderHook(() =>
      useStandardTable({ data, columns, grouping: [] }),
    );

    const flagColumn = result.current.getColumn("flag")!;
    const sortedUniqueValues = Array.from(
      flagColumn.getFacetedUniqueValues()?.keys() ?? [],
    ).sort();

    act(() => {
      const v = false;
      const checked = false;
      flagColumn.setFilterValue((oldValue: boolean[] | undefined) => {
        const previousValue = oldValue?.length ? oldValue : [...sortedUniqueValues];
        return checked
          ? [...new Set([...previousValue, !!v])]
          : previousValue?.filter((a) => !!a !== !!v);
      });
    });

    const names = result.current.getRowModel().rows.map((r) => r.getValue("name"));
    expect(names).toEqual(["a"]);
  });

  it("filters grouped rows when boolean filter is applied", () => {
    const columnHelper = createStockColumnHelper<Row>();
    const columns: StandardColumnDef<Row>[] = [
      columnHelper.accessor("name", { id: "name", header: "Name", enableGrouping: true }),
      columnHelper.accessor("flag", {
        id: "flag",
        header: "Flag",
        // @ts-expect-error v9 custom filter key
        filterFn: "booleanFilterFn",
      }),
    ];
    const data: Row[] = [
      { name: "a", flag: true },
      { name: "b", flag: false },
      { name: "a", flag: false },
    ];

    const { result } = renderHook(() =>
      useStandardTable({ data, columns, grouping: ["name"] }),
    );

    act(() => {
      result.current.getColumn("flag")!.setFilterValue([true]);
    });

    const filteredLeafNames = result.current
      .getFilteredRowModel()
      .flatRows.filter((r) => !r.subRows?.length)
      .map((r) => r.getValue("name"));
    expect(filteredLeafNames).toEqual(["a"]);

    const displayedLeafNames = result.current
      .getRowModel()
      .flatRows.filter((r) => !r.subRows?.length)
      .map((r) => r.getValue("name"));
    expect(displayedLeafNames).toEqual(["a"]);
    expect(result.current.getRowModel().rows.map((r) => r.getValue("name"))).not.toContain("b");
  });
});
