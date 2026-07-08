import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactTable, RowData, StockFeatures, TableState } from "@tanstack/react-table";
import { PaginatedTableControls } from "@/features/page-speed-insights/tanstack-table-v9/PaginatedTableControls";
import { StockDataTable } from "@/features/page-speed-insights/tanstack-table-v9/StockDataTable";

type TableCardProps<TData extends RowData = RowData> = {
  title: string;
  table: ReactTable<StockFeatures, TData, TableState<StockFeatures>>;
  showPagination?: boolean;
  className?: string;
  pageSize?: number;
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
}: TableCardProps<TData>) {
  return (
    <TableCardWrapper title={title} className={className}>
      <div className="w-full overflow-x-auto">
        <StockDataTable table={table} className="w-full" style={{ width: "100%" }} />
      </div>
      {showPagination && (
        <PaginatedTableControls
          table={table}
          defaultPageSize={pageSize}
          showManualControls
          className="mt-4 justify-center"
        />
      )}
    </TableCardWrapper>
  );
}

function TableCardWrapper({
  children,
  title,
  className,
}: {
  children: React.ReactNode;
  title: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
