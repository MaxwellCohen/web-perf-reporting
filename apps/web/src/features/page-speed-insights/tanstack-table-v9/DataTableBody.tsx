"use client";
import type { ReactNode } from "react";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { flexRender, type ReactTable, type RowData, type TableState } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { tanstackTableCellDataProps } from "@/features/page-speed-insights/shared/tanstackTableCellDataProps";
import type { StandardTableFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";

const rowModelStateSelector = (state: {
  columnFilters: unknown;
  sorting: unknown;
  grouping: unknown;
  expanded: unknown;
  pagination: unknown;
  globalFilter: unknown;
}) => ({
  columnFilters: state.columnFilters,
  sorting: state.sorting,
  grouping: state.grouping,
  expanded: state.expanded,
  pagination: state.pagination,
  globalFilter: state.globalFilter,
});

export function DataTableBody<TData extends RowData>({
  table,
}: {
  table: ReactTable<StandardTableFeatures, TData, TableState<StandardTableFeatures>>;
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
                    if (cell.getIsAggregated() || cell.getIsGrouped()) {
                      cellRender = flexRender(
                        cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell,
                        cell.getContext(),
                      );
                    }

                    const isExpanderColumn = cell.column.id === "expander";

                    return (
                      <TableCell
                        key={cell.id}
                        className={cn("overflow-x-auto", {
                          "p-0! flex items-center justify-center overflow-hidden": isExpanderColumn,
                        })}
                        style={{
                          width: `${cell.column.getSize()}px`,
                          ...(isExpanderColumn && {
                            minWidth: `${cell.column.getSize()}px`,
                            maxWidth: `${cell.column.getSize()}px`,
                            boxSizing: "border-box",
                          }),
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
