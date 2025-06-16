'use client';
import { useState } from 'react';
import { Table } from '@/components/ui/table';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../ui/accordion';
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
import { DataTableHeader } from './DataTableHeader';
import { DataTableBody } from './DataTableBody';
import { toTitleCase } from '../../toTitleCase';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  title: string;
}) {
  'use no memo';
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const table = useReactTable({
    // required items
    columns, // column definitions array
    data, // data array
    getCoreRowModel: getCoreRowModel(), // core row model

    // sorting,
    enableSorting: true,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),

    // filtering,
    enableColumnFilters: true,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(), // needed for client-side filtering
    // facet filtering
    getFacetedRowModel: getFacetedRowModel(), // client-side faceting
    getFacetedUniqueValues: getFacetedUniqueValues(), // for facet values
    getFacetedMinMaxValues: getFacetedMinMaxValues(), 

    // column resizing
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
        <Table
          style={{
            width: table.getTotalSize(),
          }}
        >
          <DataTableHeader table={table} />
          <DataTableBody table={table} />
        </Table>
      </AccordionContent>
    </AccordionItem>
  );
}


export function DataTableWithSubRows<T>({
    data,
    columns,
    title,
  }: {
    data: T[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: ColumnDef<T, any>[];
    title: string;
  }) {
    'use no memo';
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const table = useReactTable({
      // required items
      columns, // column definitions array
      data, // data array
      getCoreRowModel: getCoreRowModel(), // core row model
  
      // sub rows
    //   getSubRows: (row) => row.Sub,

      // sorting,
      enableSorting: true,
      onSortingChange: setSorting,
      getSortedRowModel: getSortedRowModel(),
  
      // filtering,
      enableColumnFilters: true,
      onColumnFiltersChange: setColumnFilters,
      getFilteredRowModel: getFilteredRowModel(), // needed for client-side filtering
      
      // facet filtering
      getFacetedRowModel: getFacetedRowModel(), // client-side faceting
      getFacetedUniqueValues: getFacetedUniqueValues(), // for facet values
      getFacetedMinMaxValues: getFacetedMinMaxValues(), 
  
      // column resizing
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
          <Table
            style={{
              width: table.getTotalSize(),
            }}
          >
            <DataTableHeader table={table} />
            <DataTableBody table={table} />
          </Table>
        </AccordionContent>
      </AccordionItem>
    );
  }
  