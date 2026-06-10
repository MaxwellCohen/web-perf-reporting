import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DataTableHeader } from "@/features/page-speed-insights/tanstack-table-v9/DataTableHeader";
import { DataTableBody } from "@/features/page-speed-insights/tanstack-table-v9/DataTableBody";
import type { ReactTable, RowData, StockFeatures, TableState } from "@tanstack/react-table-v9";
import { PaginationCard } from "@/features/page-speed-insights/tanstack-table-v9/PaginationCard";

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
  const [showAllResults, setShowAllResults] = useState(false);
  const rowCount = table.getRowCount();
  const canShowAllResults = rowCount > pageSize;
  const showPaginationControls = showPagination && canShowAllResults && !showAllResults;

  return (
    <TableCardWrapper title={title} className={className}>
      <div className={`w-full overflow-x-auto`}>
        <Table className="w-full" style={{ width: "100%" }}>
          <DataTableHeader table={table} />
          <DataTableBody table={table} />
        </Table>
      </div>
      {showPagination && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {showPaginationControls && <PaginationCard table={table} showManualControls />}
          {canShowAllResults && !showAllResults && (
            <Button
              variant="outline"
              onClick={() => {
                const rowCount = table.getRowCount();
                table.setPageSize(rowCount);
                setShowAllResults(true);
              }}
            >
              Show all results
            </Button>
          )}
          {showAllResults && (
            <Button
              variant="outline"
              onClick={() => {
                table.setPageSize(pageSize);
                setShowAllResults(false);
              }}
            >
              Show less results
            </Button>
          )}
        </div>
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
