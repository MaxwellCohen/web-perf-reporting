import { useState } from 'react';
import {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
} from '@tanstack/react-table';
import {
  booleanFilterFn,
  standardFilterFns,
} from '@/features/page-speed-insights/shared/filterFns';

export type SimpleTableOptions<T> = {
  data: T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
};

/**
 * Creates a simple TanStack table configuration without grouping or pagination
 * Suitable for basic data tables with sorting, filtering, and column resizing
 */
export function useSimpleTable<T>({ data, columns }: SimpleTableOptions<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
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
      ...standardFilterFns,
    },
    state: {
      sorting,
      columnFilters,
    },
  });

  return table;
}

