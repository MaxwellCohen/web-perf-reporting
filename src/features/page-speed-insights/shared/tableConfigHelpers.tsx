import {
  ColumnDef,
  useReactTable,
  getGroupedRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnFiltersState,
  PaginationState,
  VisibilityState,
  type TableOptions,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { flatTanStackTableSlice } from '@/features/page-speed-insights/shared/flatTanStackTableSlice';
import {
  ExpandAll,
  ExpandRow,
} from '@/features/page-speed-insights/JSUsage/JSUsageTable';

export type TableConfigOptions<T> = {
  data: T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixed accessor TValue; see useTableColumns
  columns: ColumnDef<T, any>[];
  grouping?: string[];
  enablePagination?: boolean;
  defaultPageSize?: number;
};

/**
 * Creates a standard TanStack table configuration with common settings
 */
export function useStandardTable<T>({
  data,
  columns,
  grouping = [],
  enablePagination = false,
  defaultPageSize = 10,
}: TableConfigOptions<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [groupingState, setGrouping] = useState<string[]>(grouping);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    expander: false,
    label: false,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableColumns = useMemo<ColumnDef<T, any>[]>(() => [
    {
      id: 'expander',
      header: (props) => <ExpandAll table={props.table} />,
      cell: ExpandRow,
      aggregatedCell: ExpandRow,
      size: 40,
      enableHiding: true,
      enableGrouping: false,
      enablePinning: true,
      enableSorting: false,
      enableResizing: true,
    },
    ...columns,
  ], [columns]);

  const table = useReactTable(
    {
      data,
      columns: tableColumns,
      ...flatTanStackTableSlice,
      getGroupedRowModel: getGroupedRowModel(),
      getExpandedRowModel: getExpandedRowModel(),
      enableExpanding: true,
      getRowCanExpand: () => false, // Disable expansion for grouped rows
      groupedColumnMode: false, // Allow sorting on grouped columns
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      onGroupingChange: setGrouping,
      ...(enablePagination && {
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
      }),
      onColumnVisibilityChange: setColumnVisibility,
      state: {
        sorting,
        columnFilters,
        grouping: groupingState,
        ...(enablePagination && { pagination }),
        columnVisibility,
      },
    } as unknown as TableOptions<T>,
  );

  return table;
}
