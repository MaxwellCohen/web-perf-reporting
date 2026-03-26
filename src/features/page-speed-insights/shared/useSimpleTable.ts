import { useState } from 'react';
import {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  useReactTable,
  type TableOptions,
} from '@tanstack/react-table';
import { flatTanStackTableSlice } from '@/features/page-speed-insights/shared/flatTanStackTableSlice';

export type SimpleTableOptions<T> = {
  data: T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
};

/**
 * Flat TanStack table: sorting, filtering, faceting, column resize (no grouping/pagination).
 * Shares configuration with useStandardTable via flatTanStackTableSlice.
 */
export function useSimpleTable<T>({ data, columns }: SimpleTableOptions<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    ...flatTanStackTableSlice,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  } as TableOptions<T>);

  return table;
}
