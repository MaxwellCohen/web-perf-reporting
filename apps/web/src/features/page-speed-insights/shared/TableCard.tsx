import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactTable, RowData } from "@tanstack/react-table";
import { PaginatedTableControls } from "@/features/page-speed-insights/tanstack-table-v9/PaginatedTableControls";
import { StockDataTable } from "@/features/page-speed-insights/tanstack-table-v9/StockDataTable";
import { cn } from "@/lib/utils";

type TableCardShellProps = {
  title: string;
  className?: string;
  /** Sits on the title row, e.g. an estimated-savings badge. */
  headerAside?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Card chrome for tables (title + content). Use when the card holds multiple
 * tables or custom content; prefer TableCard for a single StockDataTable.
 */
export function TableCardShell({ title, className, headerAside, children }: TableCardShellProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          {headerAside}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

type TableCardProps<TData extends RowData = RowData> = {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: ReactTable<any, TData, any>;
  showPagination?: boolean;
  className?: string;
  pageSize?: number;
  /** Extra classes on the scroll/overflow wrapper around StockDataTable. */
  tableContainerClassName?: string;
  tableAriaLabel?: string;
  onRowClick?: (row: TData) => void;
  isRowSelected?: (row: TData) => boolean;
  showColumnLayout?: boolean;
};

/**
 * A reusable card component for displaying tables
 */
export function TableCard<TData extends RowData = RowData>({
  title,
  table,
  showPagination = false,
  className = "md:col-span-2 lg:col-span-3",
  pageSize = 10,
  tableContainerClassName,
  tableAriaLabel,
  onRowClick,
  isRowSelected,
  showColumnLayout = false,
}: TableCardProps<TData>) {
  return (
    <TableCardShell title={title} className={className}>
      <div className={cn("w-full overflow-x-auto", tableContainerClassName)}>
        <StockDataTable
          table={table}
          aria-label={tableAriaLabel}
          onRowClick={onRowClick}
          isRowSelected={isRowSelected}
          showColumnLayout={showColumnLayout}
        />
      </div>
      {showPagination && (
        <PaginatedTableControls
          table={table}
          defaultPageSize={pageSize}
          showManualControls
          className="mt-4 justify-center"
        />
      )}
    </TableCardShell>
  );
}

type LabeledStockTableProps<TData extends RowData = RowData> = {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: ReactTable<any, TData, any>;
  showPagination?: boolean;
  showColumnLayout?: boolean;
};

/** One labeled StockDataTable section inside a multi-report TableCardShell. */
export function LabeledStockTable<TData extends RowData = RowData>({
  label,
  table,
  showPagination = false,
  showColumnLayout = false,
}: LabeledStockTableProps<TData>) {
  return (
    <div>
      <h5 className="mb-2 text-sm font-semibold text-muted-foreground">{label}</h5>
      <div className="w-full overflow-x-auto">
        <StockDataTable table={table} showColumnLayout={showColumnLayout} />
      </div>
      {showPagination && (
        <PaginatedTableControls table={table} showManualControls className="mt-4 justify-center" />
      )}
    </div>
  );
}

type MultiReportTableCardProps = {
  title: string;
  className?: string;
  children: React.ReactNode;
};

/** Card shell for multiple per-report table sections. */
export function MultiReportTableCard({ title, className, children }: MultiReportTableCardProps) {
  return (
    <TableCardShell title={title} className={className}>
      <div className="space-y-6">{children}</div>
    </TableCardShell>
  );
}
