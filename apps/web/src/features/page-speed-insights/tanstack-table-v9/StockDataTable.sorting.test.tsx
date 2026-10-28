import { describe, expect, it } from "vitest";
import { act, fireEvent, render, renderHook } from "@testing-library/react";
import { StockDataTable } from "@/features/page-speed-insights/tanstack-table-v9/StockDataTable";
import { FullWidthTables } from "@/features/page-speed-insights/tanstack-table-v9/fullWidthTables";
import {
  useSimpleTable,
  type FlatColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useSimpleTable";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";

type Row = { description: string; severity: string };

const columnHelper = createStockColumnHelper<Row>();
const columns = [
  columnHelper.accessor("description", {
    id: "description",
    header: "Description",
    enableSorting: true,
    sortFn: "alphanumeric",
  }),
  columnHelper.accessor("severity", {
    id: "severity",
    header: "Severity",
    enableSorting: true,
    sortFn: "alphanumeric",
  }),
] as FlatColumnDef<Row>[];

const data: Row[] = [
  { description: "No HSTS header found", severity: "High" },
  { description: "max-age too low", severity: "Medium" },
  { description: "Missing includeSubDomains", severity: "Low" },
];

describe("StockDataTable sorting", () => {
  it("reorders rows when sort button is clicked", () => {
    const { result } = renderHook(() => useSimpleTable({ data, columns }));
    const { container, rerender } = render(
      <FullWidthTables>
        <StockDataTable table={result.current} showCopy={false} />
      </FullWidthTables>,
    );

    const bodyText = () =>
      [...container.querySelectorAll("tbody tr")].map((row) => row.textContent);

    expect(bodyText()[0]).toContain("No HSTS header found");

    const sortButtons = [...container.querySelectorAll("thead button")].filter((button) =>
      /Sort|〰|↑|↓/.test(button.getAttribute("title") || button.textContent || ""),
    );
    // Severity is the second sortable column (description, severity) → buttons 0 and 1
    const severitySort = sortButtons[1] ?? container.querySelectorAll("thead button")[1];
    expect(severitySort).toBeTruthy();

    act(() => {
      fireEvent.click(severitySort!);
    });
    rerender(
      <FullWidthTables>
        <StockDataTable table={result.current} showCopy={false} />
      </FullWidthTables>,
    );

    expect(result.current.getColumn("severity")!.getIsSorted()).toBeTruthy();
    expect(bodyText().join("|")).toMatch(/High.*Low|High.*Medium|Low.*Medium|Medium.*High/);
  });
});
