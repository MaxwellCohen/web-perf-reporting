"use client";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { flexRender, type ReactTable, type RowData } from "@tanstack/react-table";
import { useFullWidthTables } from "@/features/page-speed-insights/tanstack-table-v9/fullWidthTables";
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
  columnVisibility: unknown;
  columnOrder: unknown;
}) => ({
  columnFilters: state.columnFilters,
  sorting: state.sorting,
  grouping: state.grouping,
  expanded: state.expanded,
  pagination: state.pagination,
  globalFilter: state.globalFilter,
  columnSizing: state.columnSizing,
  columnResizing: state.columnResizing,
  columnVisibility: state.columnVisibility,
  columnOrder: state.columnOrder,
});

function rowClickIgnored(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest("a, button, input, select, textarea");
}

export function DataTableBody<TData extends RowData>({
  table,
  onRowClick,
  isRowSelected,
}: {
  table: ReactTable<any, TData, any>;
  onRowClick?: (row: TData) => void;
  isRowSelected?: (row: TData) => boolean;
}) {
  const fillWidth = useFullWidthTables();

  return (
    <table.Subscribe selector={rowModelStateSelector}>
      {() => (
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const selected = isRowSelected?.(row.original) ?? false;
            return (
              <TableRow
                key={row.id}
                data-state={selected ? "selected" : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={(event) => {
                  if (!onRowClick || rowClickIgnored(event.target)) return;
                  onRowClick(row.original);
                }}
                onKeyDown={(event) => {
                  if (!onRowClick || (event.key !== "Enter" && event.key !== " ")) return;
                  if (rowClickIgnored(event.target)) return;
                  event.preventDefault();
                  onRowClick(row.original);
                }}
              >
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
                          // Full-width mode: minWidth only so table-fixed can grow columns into leftover space.
                          minWidth: `${size}px`,
                          ...(fillWidth
                            ? isExpanderColumn
                              ? { width: `${size}px`, maxWidth: `${size}px` }
                              : {}
                            : { width: `${size}px`, maxWidth: `${size}px` }),
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
