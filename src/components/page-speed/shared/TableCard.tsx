import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DataTableHeader } from '@/components/page-speed/lh-categories/table/DataTableHeader';
import { DataTableBody } from '@/components/page-speed/lh-categories/table/DataTableBody';
import { Table as TableType } from '@tanstack/react-table';
import { PaginationCard } from '@/components/page-speed/JSUsage/TableControls';

type TableCardProps<T = unknown> = {
  title: string;
  table: TableType<T>;
  showPagination?: boolean;
  className?: string;
  // maxHeight?: string;
  pageSize?: number;
};

/**
 * A reusable card component for displaying tables
 */
export function TableCard<T = unknown>({
  title,
  table,
  showPagination = false,
  className = 'md:col-span-2 lg:col-span-3',
  // maxHeight,
  pageSize = 10,
}: TableCardProps<T>) {
  'use no memo';
  const [showAllResults, setShowAllResults] = useState(false);
  const rowCount = table.getRowCount();
  const canShowAllResults = rowCount > pageSize;
  const showPaginationControls =
    showPagination && canShowAllResults && !showAllResults;

  return (
    <TableCardWrapper title={title} className={className}>
      <div className={`w-full overflow-x-auto`}>
        <Table className="w-full" style={{ width: '100%' }}>
          <DataTableHeader table={table} />
          <DataTableBody table={table} />
        </Table>
      </div>
      {showPagination && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {showPaginationControls && (
            <PaginationCard table={table} showManualControls />
          )}
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
  "use no memo";
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
