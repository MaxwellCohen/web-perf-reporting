"use client";

import type { ReactNode } from "react";
import { Table } from "@/components/ui/table";
import type { RowData } from "@tanstack/react-table-v9";
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
    <div className={cn("w-full", wrapperClassName)}>
      {showCopy && (
        <div className="mb-2 flex justify-end">
          <CopyTableButton table={table} />
        </div>
      )}
      <Table className={className} style={style} aria-label={ariaLabel}>
        {caption}
        <DataTableHeader table={table} />
        {children ?? <DataTableBody table={table} />}
      </Table>
    </div>
  );
}
