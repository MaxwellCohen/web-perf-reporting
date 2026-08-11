"use client";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { flexRender, type ReactTable, type RowData } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { tanstackTableCellDataProps } from "@/features/page-speed-insights/shared/tanstackTableCellDataProps";

const rowModelStateSelector = (state: {
  columnFilters: unknown;
  sorting: unknown;
  grouping: unknown;
  expanded: unknown;
  pagination: unknown;
  globalFilter: unknown;
  columnSizing: unknown;
  columnResizing: unknown;
}) => ({
  columnFilters: state.columnFilters,
  sorting: state.sorting,
  grouping: state.grouping,
  expanded: state.expanded,
  pagination: state.pagination,
  globalFilter: state.globalFilter,
  columnSizing: state.columnSizing,
  columnResizing: state.columnResizing,
});

export function DataTableBody<TData extends RowData>({
  table,
}: {
  table: ReactTable<any, TData, any>;
}) {
  return (
    <table.Subscribe selector={rowModelStateSelector}>
      {() => (
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            return (
              <TableRow key={row.id}>
                {row
                  .getVisibleCells()
                  .map((cell) => {
                    let cellRender = flexRender(cell.column.columnDef.cell, cell.getContext());
                    // v9: getIsAggregated() is true only when the column has an aggregationFn.
                    const shouldUseAggregated =
                      cell.getIsAggregated() ||
                      (row.subRows.length > 0 &&
                        !cell.getIsGrouped() &&
                        !!cell.column.columnDef.aggregatedCell);
                    if (shouldUseAggregated) {
                      cellRender = flexRender(
                        cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell,
                        cell.getContext(),
                      );
                    }

                    const isExpanderColumn = cell.column.id === "expander";
                    const size = cell.column.getSize();

                    return (
                      <TableCell
                        key={cell.id}
                        className={cn("overflow-x-auto", {
                          "p-0! flex items-center justify-center overflow-hidden": isExpanderColumn,
                        })}
                        style={{
                          width: `${size}px`,
                          minWidth: `${size}px`,
                          maxWidth: `${size}px`,
                          ...(isExpanderColumn && { boxSizing: "border-box" }),
                        }}
                        {...tanstackTableCellDataProps(cell, row)}
                      >
                        {cellRender}
                      </TableCell>
                    );
                  })
                  .filter((v) => !!v)}
              </TableRow>
            );
          })}
        </TableBody>
      )}
    </table.Subscribe>
  );
}
