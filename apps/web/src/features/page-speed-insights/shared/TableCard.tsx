import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RowData } from "@tanstack/react-table";
import type { StockTable } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { PaginatedTableControls } from "@/features/page-speed-insights/tanstack-table-v9/PaginatedTableControls";
import { StockDataTable } from "@/features/page-speed-insights/tanstack-table-v9/StockDataTable";
import { cn } from "@/lib/utils";

type TableCardProps = {
  title: string;
  className?: string;
  /** Sits on the title row, e.g. an estimated-savings badge. */
  headerAside?: React.ReactNode;
  children: React.ReactNode;
};

/** Card chrome for tables (title + content). Compose with TableCard.Table / Pagination / Section. */
function TableCardRoot({ title, className, headerAside, children }: TableCardProps) {
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

type TableCardTableProps<TData extends RowData> = React.ComponentProps<
  typeof StockDataTable<TData>
> & {
  /** Extra classes on the scroll/overflow wrapper around StockDataTable. */
  containerClassName?: string;
};

function TableCardTable<TData extends RowData = RowData>({
  containerClassName,
  ...tableProps
}: TableCardTableProps<TData>) {
  return (
    <div className={cn("w-full overflow-x-auto", containerClassName)}>
      <StockDataTable {...tableProps} />
    </div>
  );
}

function TableCardPagination<TData extends RowData = RowData>({
  table,
  pageSize,
}: {
  table: StockTable<TData>;
  pageSize?: number;
}) {
  return (
    <PaginatedTableControls
      table={table}
      defaultPageSize={pageSize}
      showManualControls
      className="mt-4 justify-center"
    />
  );
}

/** One labeled section inside a multi-table TableCard. */
function TableCardSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h5 className="mb-2 text-sm font-semibold text-muted-foreground">{label}</h5>
      {children}
    </div>
  );
}

export const TableCard = Object.assign(TableCardRoot, {
  Table: TableCardTable,
  Pagination: TableCardPagination,
  Section: TableCardSection,
});
