'use client';
'use no memo';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableHeader,
} from '@/components/ui/table';
import {
  ColumnFiltersState,
  ExpandedState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
  VisibilityState,
  getGroupedRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
} from '@tanstack/react-table';
import type { TreeMapData } from '@/lib/schema';
import { NoResultsRow } from '@/components/page-speed/JSUsage/NoResultsRow';
import { TableControls } from '@/components/page-speed/JSUsage/TableControls';
import { columns } from '@/components/page-speed/JSUsage/jsUsageTableColumns';
import { JSUsageTableHeader } from '@/components/page-speed/JSUsage/jsUsageTableHeader';
import { JSUsageTableRow } from '@/components/page-speed/JSUsage/jsUsageTableRow';

export { ExpandRow, ExpandAll, RenderBytesCell } from './jsUsageTableParts';
export { makeSortingHeading } from './jsUsageTableColumns';
export { StringFilterHeader } from './StringFilterHeader';
export { RangeFilter, numericRangeFilter } from './jsUsageTableFilters';

export function useUseJSUsageTable(data: TreeMapData['nodes']) {
  'use no memo';
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    host: false,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [grouping, setGrouping] = useState(['host']);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    columns,
    data: data,
    onGroupingChange: setGrouping,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableSubRowSelection: true,
    getSubRows: (row) => (row.children?.length ? row.children : undefined),
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    getGroupedRowModel: getGroupedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    enableExpanding: true,
    filterFromLeafRows: true,
    maxLeafRowFilterDepth: 5,
    enableSorting: true,
    filterFns: {
      booleanFilterFn: () => true,
    },
    state: {
      columnPinning: {
        left: ['expander', 'Usage Status', 'name', 'host'],
      },
      pagination,
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      grouping,
      expanded: expanded,
    },
  });

  return table;
}

export function JSUsageTableWithControls({
  data,
  depth = 0,
}: {
  data: TreeMapData['nodes'];
  label?: string;
  depth?: number;
}) {
  'use no memo';
  const table = useUseJSUsageTable(data);
  const rows = table.getRowModel().rows;

  return (
    <>
      {depth === 0 ? <TableControls table={table} /> : null}
      <Table className="border-none">
        <TableHeader className="" suppressHydrationWarning>
          {table.getHeaderGroups().map((headerGroup, i) => (
            <JSUsageTableHeader
              key={`${headerGroup.id}_${i}_${depth}`}
              headerGroup={headerGroup}
              depth={depth}
              i={i}
            />
          ))}
        </TableHeader>
        <TableBody className="flex flex-col border-0" suppressHydrationWarning>
          {rows?.length ? (
            rows.map((row, i) => (
              <JSUsageTableRow
                key={`${row.id}_${i}_${depth}`}
                row={row}
                i={i}
              />
            ))
          ) : (
            <NoResultsRow />
          )}
        </TableBody>
      </Table>
    </>
  );
}
