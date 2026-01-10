'use client';
import { useMemo, useState } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  FilterFn,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Table } from '@/components/ui/table';
import { DataTableHeader } from '@/components/page-speed/lh-categories/table/DataTableHeader';
import { DataTableBody } from '@/components/page-speed/lh-categories/table/DataTableBody';
import { booleanFilterFn } from '@/components/page-speed/lh-categories/table/DataTableNoGrouping';
import { formatBytes, formatTime } from './utils';
import { RenderBytesValue, RenderMSValue } from '@/components/page-speed/lh-categories/table/RenderTableValue';

interface ResourceItem {
  url?: string;
  wastedBytes?: number;
  wastedMs?: number;
  totalBytes?: number;
  wastedPercent?: number;
  total?: number;
  scripting?: number;
  scriptParseCompile?: number;
  [key: string]: unknown;
}

interface ResourcesTableProps {
  items: ResourceItem[];
}

export function ResourcesTable({ items }: ResourcesTableProps) {
  "use no memo";
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const columns = useMemo<ColumnDef<ResourceItem>[]>(() => {
    return [
      {
        id: 'url',
        accessorKey: 'url',
        header: 'Resource URL',
        size: 400,
        minSize: 200,
        maxSize: 800,
        enableResizing: true,
        filterFn: 'includesString',
        cell: ({ row }) => {
          const url = row.original.url;
          if (url && url !== 'Unattributable') {
            return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline break-all"
              >
                {url}
              </a>
            );
          }
          return <span className="text-muted-foreground">Unattributable</span>;
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'wastedBytes',
        accessorKey: 'wastedBytes',
        header: 'Wasted Bytes',
        size: 120,
        minSize: 80,
        maxSize: 200,
        enableResizing: true,
        filterFn: 'inNumberRange',
        cell: ({ row }) => {
          const value = row.original.wastedBytes;
          return value !== undefined && value > 0 ? (
            <RenderBytesValue value={value} />
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'wastedMs',
        accessorKey: 'wastedMs',
        header: 'Wasted Time',
        size: 120,
        minSize: 80,
        maxSize: 200,
        enableResizing: true,
        filterFn: 'inNumberRange',
        cell: ({ row }) => {
          const value = row.original.wastedMs;
          return value !== undefined && value > 0 ? (
            <RenderMSValue value={value} />
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'wastedPercent',
        accessorKey: 'wastedPercent',
        header: 'Wasted %',
        size: 100,
        minSize: 70,
        maxSize: 150,
        enableResizing: true,
        filterFn: 'inNumberRange',
        cell: ({ row }) => {
          const value = row.original.wastedPercent;
          return value !== undefined && value > 0 ? (
            <span>{value.toFixed(1)}%</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'totalBytes',
        accessorKey: 'totalBytes',
        header: 'Total Size',
        size: 120,
        minSize: 80,
        maxSize: 200,
        enableResizing: true,
        filterFn: 'inNumberRange',
        cell: ({ row }) => {
          const value = row.original.totalBytes;
          return value !== undefined && value > 0 ? (
            <RenderBytesValue value={value} />
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'scripting',
        accessorKey: 'scripting',
        header: 'Scripting Time',
        size: 130,
        minSize: 90,
        maxSize: 200,
        enableResizing: true,
        filterFn: 'inNumberRange',
        cell: ({ row }) => {
          const value = row.original.scripting;
          return value !== undefined && value > 0 ? (
            <RenderMSValue value={value} />
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'scriptParseCompile',
        accessorKey: 'scriptParseCompile',
        header: 'Parse/Compile Time',
        size: 150,
        minSize: 100,
        maxSize: 200,
        enableResizing: true,
        filterFn: 'inNumberRange',
        cell: ({ row }) => {
          const value = row.original.scriptParseCompile;
          return value !== undefined && value > 0 ? (
            <RenderMSValue value={value} />
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'total',
        accessorKey: 'total',
        header: 'Total CPU Time',
        size: 130,
        minSize: 90,
        maxSize: 200,
        enableResizing: true,
        filterFn: 'inNumberRange',
        cell: ({ row }) => {
          const value = row.original.total;
          return value !== undefined && value > 0 ? (
            <RenderMSValue value={value} />
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
    ];
  }, []);

  const table = useReactTable({
    data: items,
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
      includesString: ((row, columnId, filterValue) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cellValue = String((row as any).getValue(columnId) || '').toLowerCase();
        const filter = String(filterValue || '').toLowerCase();
        return cellValue.includes(filter);
      }) as FilterFn<ResourceItem>,
      inNumberRange: ((row, columnId, filterValue) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cellValue = Number((row as any).getValue(columnId)) || 0;
        const [min, max] = (filterValue as [number, number]) || [0, Infinity];
        return cellValue >= min && cellValue <= max;
      }) as FilterFn<ResourceItem>,
    } as Record<string, FilterFn<ResourceItem>>,
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full">
        <DataTableHeader table={table} />
        <DataTableBody table={table} />
      </Table>
    </div>
  );
}

