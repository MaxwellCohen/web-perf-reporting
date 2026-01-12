'use client';
import { useState } from 'react';
import { Table } from '@/components/ui/table';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { DataTableHeader } from '@/components/page-speed/lh-categories/table/DataTableHeader';
import { DataTableBody } from '@/components/page-speed/lh-categories/table/DataTableBody';
import { toTitleCase } from '@/components/page-speed/toTitleCase';

export const booleanFilterFn: FilterFn<unknown> = (row, columnId, filterValue) => {
  if (!filterValue || !filterValue.length) {
    return true;
  }
  const cellValue = row.getValue(columnId);
  return filterValue.find((a: unknown) => !!a === !!cellValue) !== undefined;
};

export function DataTableNoGrouping<T>({
  data,
  columns,
  title,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  title: string;
}) {
  'use no memo';
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: true,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    enableColumnFilters: true,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',

    filterFns: {
      booleanFilterFn,
    },

    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <AccordionItem value={title}>
      <AccordionTrigger>
        <div className="text-lg font-bold group-hover:underline">{toTitleCase(title)}</div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="w-full overflow-x-auto">
          <Table className="w-full" style={{ width: '100%' }}>
            <DataTableHeader table={table} />
            <DataTableBody table={table} />
          </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
  