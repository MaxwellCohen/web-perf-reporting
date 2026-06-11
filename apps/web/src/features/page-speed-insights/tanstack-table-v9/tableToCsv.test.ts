import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { escapeCsvCell } from "@/features/page-speed-insights/tanstack-table-v9/csvCell";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { useSimpleTable } from "@/features/page-speed-insights/tanstack-table-v9/useSimpleTable";
import { useStandardTable } from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";
import { tableToCsv } from "@/features/page-speed-insights/tanstack-table-v9/tableToCsv";

type Row = {
  id: string;
  name: string;
  score: number;
};

describe("escapeCsvCell", () => {
  it("quotes values containing commas", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
  });

  it("escapes embedded double quotes", () => {
    expect(escapeCsvCell('say "hello"')).toBe('"say ""hello"""');
  });
});

describe("tableToCsv", () => {
  it("serializes visible columns and displayed rows as comma-separated text", () => {
    const columnHelper = createStockColumnHelper<Row>();
    const columns = [
      columnHelper.accessor("id", { header: "ID" }),
      columnHelper.accessor("name", { header: "Name" }),
      columnHelper.accessor("score", { header: "Score" }),
    ];
    const data: Row[] = [
      { id: "1", name: "Alpha", score: 90 },
      { id: "2", name: "Beta", score: 75 },
    ];

    const { result } = renderHook(() => useSimpleTable({ data, columns: columns as never }));

    expect(tableToCsv(result.current as never)).toBe(
      "ID,Name,Score\n1,Alpha,90\n2,Beta,75",
    );
  });

  it("excludes the expander column", () => {
    const columnHelper = createStockColumnHelper<Row>();
    const columns = [
      {
        id: "expander",
        header: "Expand",
        cell: () => null,
      },
      columnHelper.accessor("name", { header: "Name" }),
    ];
    const data: Row[] = [{ id: "1", name: "Alpha", score: 90 }];

    const { result } = renderHook(() => useSimpleTable({ data, columns: columns as never }));

    expect(tableToCsv(result.current as never)).toBe("Name\nAlpha");
  });

  it("copies only the rows currently shown in the table", () => {
    const columnHelper = createStockColumnHelper<Row>();
    const columns = [columnHelper.accessor("name", { header: "Name" })];
    const data: Row[] = Array.from({ length: 12 }, (_, index) => ({
      id: `${index}`,
      name: `Row ${index}`,
      score: index,
    }));

    const { result } = renderHook(() =>
      useStandardTable({
        data,
        columns: columns as never,
        enablePagination: true,
        defaultPageSize: 5,
      }),
    );

    const csv = tableToCsv(result.current as never);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(6);
    expect(lines[0]).toBe("Name");
    expect(lines[1]).toBe("Row 0");
    expect(lines[5]).toBe("Row 4");
  });
});
