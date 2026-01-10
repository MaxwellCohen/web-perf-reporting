import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Table } from '@/components/ui/table';
import { DataTableHeader } from '../lh-categories/table/DataTableHeader';
import { DataTableBody } from '../lh-categories/table/DataTableBody';
import { Table as TableType } from '@tanstack/react-table';
import { PaginationCard } from '../JSUsage/TableControls';

type TableCardProps<T = unknown> = {
  title: string;
  table: TableType<T>;
  showPagination?: boolean;
  className?: string;
  maxHeight?: string;
};

/**
 * A reusable card component for displaying tables
 */
export function TableCard<T = unknown>({
  title,
  table,
  showPagination = false,
  className = 'md:col-span-2 lg:col-span-3',
  maxHeight,
}: TableCardProps<T>) {
  "use no memo";
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`w-full overflow-x-auto ${maxHeight || ''}`} style={maxHeight ? { maxHeight } : undefined}>
          <Table className="w-full" style={{ width: '100%' }}>
            <DataTableHeader table={table} />
            <DataTableBody table={table} />
          </Table>
        </div>
        {showPagination && <PaginationCard table={table} showManualControls />}
      </CardContent>
    </Card>
  );
}

