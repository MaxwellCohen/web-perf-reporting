"use client";

import type { ReactNode } from "react";
import { Table } from "@/components/ui/table";
import type { RowData } from "@tanstack/react-table";
import { DataTableHeader } from "@/features/page-speed-insights/tanstack-table-v9/DataTableHeader";
import { DataTableBody } from "@/features/page-speed-insights/tanstack-table-v9/DataTableBody";
import { CopyTableButton } from "@/features/page-speed-insights/tanstack-table-v9/CopyTableButton";
import type { StockTable } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { cn } from "@/lib/utils";

type StockDataTableProps<TData extends RowData> = {
  table: StockTable<TData>;
  className?: string;
  style?: React.CSSProperties;
  wrapperClassName?: string;
  showCopy?: boolean;
  caption?: ReactNode;
  children?: ReactNode;
  "aria-label"?: string;
};

const columnSizeSelector = (state: {
  columnSizing: unknown;
  columnResizing: unknown;
}) => ({
  columnSizing: state.columnSizing,
  columnResizing: state.columnResizing,
});

/**
 * Shared data table: header + body with per-column resize.
 * Table width is exactly the sum of column sizes so `table-fixed` does not
 * redistribute leftover space across every column when one is resized.
 */
export function StockDataTable<TData extends RowData>({
  table,
  className,
  style,
  wrapperClassName,
  showCopy = true,
  caption,
  children,
  "aria-label": ariaLabel,
}: StockDataTableProps<TData>) {
  return (
    <div className={cn("w-full min-w-0", wrapperClassName)}>
      {showCopy && (
        <div className="mb-2 flex justify-end">
          <CopyTableButton table={table} />
        </div>
      )}
      <table.Subscribe selector={columnSizeSelector}>
        {() => (
          <Table
            className={cn("w-max!", className)}
            style={{
              ...style,
              width: table.getTotalSize(),
            }}
            aria-label={ariaLabel}
            wrapperClassName="min-w-0"
          >
            {caption}
            <DataTableHeader table={table} />
            {children ?? <DataTableBody table={table} />}
          </Table>
        )}
      </table.Subscribe>
    </div>
  );
}
