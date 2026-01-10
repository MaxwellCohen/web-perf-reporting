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
import { RenderTableValue } from '@/components/page-speed/lh-categories/table/RenderTableValue';
import type { TableColumnHeading, TableItem } from '@/lib/schema';
import { booleanFilterFn } from '@/components/page-speed/lh-categories/table/DataTableNoGrouping';

interface IssuesFoundTableProps {
  headings: TableColumnHeading[];
  items: TableItem[];
  device: string;
}

export function IssuesFoundTable({ headings, items, device }: IssuesFoundTableProps) {
  "use no memo";
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Create column definitions from headings
  const columns = useMemo<ColumnDef<TableItem>[]>(() => {
    return headings.map((heading) => {
      const key = heading.key || '';
      const label = typeof heading.label === 'string' ? heading.label : key;
      
      // Determine filter function based on value type
      const valueType = heading.valueType;
      let filterFn: 'includesString' | 'inNumberRange' | undefined;
      if (valueType === 'numeric' || valueType === 'bytes' || valueType === 'timespanMs') {
        filterFn = 'inNumberRange';
      } else if (valueType === 'code' || valueType === 'url' || valueType === 'text' || !valueType) {
        filterFn = 'includesString';
      }

      // Set initial column size based on content type
      let initialSize = 150;
      if (key === 'url' || label.toLowerCase().includes('url')) {
        initialSize = 300;
      } else if (valueType === 'bytes' || valueType === 'numeric' || valueType === 'timespanMs') {
        initialSize = 120;
      } else if (label.toLowerCase().includes('protocol') || label.toLowerCase().includes('mime')) {
        initialSize = 100;
      }

      const columnDef: ColumnDef<TableItem> = {
        id: key,
        accessorKey: key,
        header: label,
        size: initialSize,
        minSize: 50,
        maxSize: 800,
        enableResizing: true,
        meta: {
          heading: {
            heading,
          },
        },
        cell: ({ row }) => {
          const value = row.original[key];
          const subItems = row.original.subItems;

          if (subItems?.items && subItems.items.length > 0) {
            const subKey = heading.subItemsHeading?.key || 'url';
            const subHeading: TableColumnHeading | null = heading.subItemsHeading
              ? ({
                  ...heading.subItemsHeading,
                  key: subKey,
                  label: (heading.subItemsHeading as TableColumnHeading).label || subKey,
                } as TableColumnHeading)
              : heading;

            return (
              <div className="space-y-1">
                <div className="font-medium">
                  <RenderTableValue
                    value={value}
                    heading={heading}
                    device={device}
                  />
                </div>
                <ul className="list-disc list-inside ml-2 space-y-0.5 text-muted-foreground">
                  {subItems.items.map((subItem: TableItem, subIdx: number) => {
                    const subValue = subItem[subKey];
                    return (
                      <li key={subIdx} className="text-xs wrap-break-word">
                        <RenderTableValue
                          value={subValue}
                          heading={subHeading}
                          device={device}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          }

          return (
            <div className="wrap-break-word">
              <RenderTableValue
                value={value}
                heading={heading}
                device={device}
              />
            </div>
          );
        },
        enableSorting: true,
        enableColumnFilter: true,
      };

      if (filterFn) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (columnDef as any).filterFn = filterFn;
      }

      return columnDef;
    });
  }, [headings, device]);

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
      }) as FilterFn<TableItem>,
      inNumberRange: ((row, columnId, filterValue) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cellValue = Number((row as any).getValue(columnId)) || 0;
        const [min, max] = (filterValue as [number, number]) || [0, Infinity];
        return cellValue >= min && cellValue <= max;
      }) as FilterFn<TableItem>,
    } as Record<string, FilterFn<TableItem>>,
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

