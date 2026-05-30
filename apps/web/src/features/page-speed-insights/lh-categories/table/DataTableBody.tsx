"use client";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { flexRender, Table as TableType } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { tanstackTableCellDataProps } from "@/features/page-speed-insights/shared/tanstackTableCellDataProps";

export function DataTableBody<T>({ table }: { table: TableType<T> }) {
  "use no memo";
  return (
    <TableBody>
      {table.getRowModel().rows.map((row) => {
        return (
          <TableRow key={row.id}>
            {row
              .getVisibleCells()
              .map((cell) => {
                let cellRender = flexRender(cell.column.columnDef.cell, cell.getContext());
                if (cell.getIsAggregated() || cell.getIsGrouped()) {
                  cellRender = flexRender(cell.column.columnDef.aggregatedCell, cell.getContext());
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
  );
}
