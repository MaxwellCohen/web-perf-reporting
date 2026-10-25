import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColumnLayoutControls } from "@/features/page-speed-insights/tanstack-table-v9/ColumnLayoutControls";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import {
  useStandardTable,
  type StandardColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";

type Row = { url: string; bytes: number };

function Harness() {
  const columnHelper = createStockColumnHelper<Row>();
  const columns: StandardColumnDef<Row>[] = [
    columnHelper.accessor("url", { id: "url", header: "URL" }),
    columnHelper.accessor("bytes", { id: "bytes", header: "Bytes", sortFn: "basic" }),
  ];
  const table = useStandardTable({
    data: [{ url: "https://example.com/a.js", bytes: 10 }],
    columns,
  });

  return <ColumnLayoutControls table={table} />;
}

function columnNames(): Array<string | null> {
  return screen.getAllByRole("checkbox").map((node) => node.getAttribute("aria-label"));
}

describe("ColumnLayoutControls", () => {
  it("hides a column, reorders, and clears back to the default layout", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Columns" }));

    expect(columnNames()).toEqual(["URL", "Bytes"]);
    fireEvent.click(screen.getByRole("button", { name: "Move URL down" }));
    expect(columnNames()).toEqual(["Bytes", "URL"]);

    fireEvent.click(screen.getByRole("checkbox", { name: "Bytes" }));
    expect(screen.getByRole("checkbox", { name: "Bytes" })).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(columnNames()).toEqual(["URL", "Bytes"]);
    expect(screen.getByRole("checkbox", { name: "Bytes" })).toBeChecked();
  });
});
