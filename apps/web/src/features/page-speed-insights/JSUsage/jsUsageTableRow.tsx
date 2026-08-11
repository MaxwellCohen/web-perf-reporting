"use client";
import type { StockCellContext, StockColumnDef, StockHeader, StockHeaderContext, StockHeaderGroup, StockRow, StockTable, StockCell } from "@/features/page-speed-insights/shared/tanstackStockTypes";

import { TableRow, TableCell } from "@/components/ui/table";
import { flexRender } from "@tanstack/react-table";
import type { Row } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { TreeMapNode } from "@/lib/schema";
import { tanstackTableCellDataProps } from "@/features/page-speed-insights/shared/tanstackTableCellDataProps";

export function JSUsageTableRow({ row, i }: { row: StockRow<TreeMapNode>; i: number }) {
  
  const isExpanded = row.getIsExpanded();
  const depth = row.depth + (isExpanded ? 1 : 0);
  const subRows = row?.getParentRow()?.subRows || [];

  return (
    <>
      <TableRow
        data-children={row?.original?.children?.length || 0}
        className={cn("flex w-max min-w-full border-muted", {
          "border-b-[length:--depth]": depth && row.index + 1 === (subRows.length || 0),
          "border-r-[length:--depth]": depth,
          "border-r-[length:--depth] border-t-[length:--depth]": isExpanded,
          "border-b-[length:--depth] border-muted":
            (depth || isExpanded) && subRows.findIndex((a) => a == row) === subRows.length - 1,
        })}
        style={{
          // @ts-expect-error ts is weird
          "--depth": `${5 * depth}px`,
        }}
        suppressHydrationWarning
      >
        {row
          .getVisibleCells()
          .map((cell, index) => {
            const cellContent = flexRender(cell.column.columnDef.cell, cell.getContext());
            const size = cell.column.getSize();
            return (
              <TableCell
                key={`${cell.id}_${i}_${depth}`}
                data-key={`${cell.id}_${i}_${depth}`}
                {...tanstackTableCellDataProps(cell, row)}
                className={cn(
                  "flex min-w-0 flex-row overflow-hidden",
                  {
                    "border-l-[length:--depth] border-muted": (depth || isExpanded) && !index,
                  },
                  `${cell.column.columnDef.meta?.className || ""}`,
                )}
                style={
                  typeof size === "number"
                    ? {
                        width: `${size}px`,
                        minWidth: `${size}px`,
                        maxWidth: `${size}px`,
                        flexShrink: 0,
                      }
                    : undefined
                }
                suppressHydrationWarning
              >
                {cellContent}
              </TableCell>
            );
          })
          .filter(Boolean)}
      </TableRow>
    </>
  );
}
