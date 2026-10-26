"use client";

import type { ReactNode } from "react";
import { Table } from "@/components/ui/table";
import type { RowData } from "@tanstack/react-table";
import { DataTableHeader } from "@/features/page-speed-insights/tanstack-table-v9/DataTableHeader";
import { DataTableBody } from "@/features/page-speed-insights/tanstack-table-v9/DataTableBody";
import { ColumnLayoutControls } from "@/features/page-speed-insights/tanstack-table-v9/ColumnLayoutControls";
import { CopyTableButton } from "@/features/page-speed-insights/tanstack-table-v9/CopyTableButton";
import type { StockTable } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { useFullWidthTables } from "@/features/page-speed-insights/tanstack-table-v9/fullWidthTables";
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
  onRowClick?: (row: TData) => void;
  isRowSelected?: (row: TData) => boolean;
  /** Show the shared column visibility, order, and clear controls. */
  showColumnLayout?: boolean;
};

const columnSizeSelector = (state: {
  columnSizing: unknown;
  columnResizing: unknown;
  columnVisibility: unknown;
  columnOrder: unknown;
}) => ({
  columnSizing: state.columnSizing,
  columnResizing: state.columnResizing,
  columnVisibility: state.columnVisibility,
  columnOrder: state.columnOrder,
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
  onRowClick,
  isRowSelected,
  showColumnLayout = false,
}: StockDataTableProps<TData>) {
  const fillWidth = useFullWidthTables();

  return (
    <div className={cn("w-full min-w-0", wrapperClassName)}>
      {(showCopy || showColumnLayout) && (
        <div className="mb-2 flex justify-end gap-2">
          {showColumnLayout ? <ColumnLayoutControls table={table} /> : null}
          {showCopy ? <CopyTableButton table={table} /> : null}
        </div>
      )}
      <table.Subscribe selector={columnSizeSelector}>
        {() => (
          <Table
            className={cn(fillWidth ? "min-w-full" : "w-max!", className)}
            style={{
              ...style,
              width: fillWidth ? "100%" : table.getTotalSize(),
              ...(fillWidth ? { minWidth: table.getTotalSize() } : {}),
            }}
            aria-label={ariaLabel}
            wrapperClassName="min-w-0"
          >
            {caption}
            <DataTableHeader table={table} />
            {children ?? (
              <DataTableBody table={table} onRowClick={onRowClick} isRowSelected={isRowSelected} />
            )}
          </Table>
        )}
      </table.Subscribe>
    </div>
  );
}
