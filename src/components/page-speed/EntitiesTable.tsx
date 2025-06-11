"use client"
import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { Entities } from '@/lib/schema';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import {
  CellContext,
  ColumnDef,
  ColumnFiltersState,
  createColumnHelper,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  Table as TableType,
} from '@tanstack/react-table';
import { renderBoolean } from './lh-categories/renderBoolean';
import { DataTableHeader } from './lh-categories/table/DataTableHeader';

declare module '@tanstack/react-table' {
  interface FilterFns {
    booleanFilterFn: FilterFn<unknown>;
  }
}

const booleanFilterFn: FilterFn<unknown> = (row, columnId, filterValue) => {
  if (!filterValue || !filterValue.length) {
    return true;
  }
  const cellValue = row.getValue(columnId);
  return filterValue.find((a: unknown) => !!a === !!cellValue) !== undefined;
};

function BooleanCell<T>(info: CellContext<T, boolean>) {
  return renderBoolean(!!info.getValue());
}

const columnHelper = createColumnHelper<NonNullable<Entities[number]>>();

const columnDef = [
  columnHelper.accessor('name', {
    header: 'Name',
    // enable sorting
    sortingFn: 'alphanumeric',
    filterFn: 'includesString', // use built-in filter function
    enableResizing: true,
    minSize: 200,
  }),
  columnHelper.accessor('isFirstParty', {
    header: 'Is First Party',
    filterFn: 'booleanFilterFn',
    cell: BooleanCell,
    enableResizing: true,
    minSize: 200,
  }),
  columnHelper.accessor('isUnrecognized', {
    header: 'Is Unrecognized',
    filterFn: 'booleanFilterFn',
    cell: BooleanCell,
    enableResizing: true,
    minSize: 200,
  }),
  columnHelper.accessor('origins', {
    header: 'Origins',
    enableColumnFilter: false,
    enableSorting: false,
    cell: ({ getValue }) => {
      return getValue().map((o, i) => <div key={`${i}-${o}`}>{o} </div>);
    },
    enableResizing: true,
    size: 400,
  }),
];

export function EntitiesTable({ entities = [] }: { entities?: Entities }) {
  const data = useMemo(() => {
    return (entities || [])?.filter(
      (v): v is NonNullable<Entities[number]> => !!v,
    );
  }, [entities]);

  if (data?.length === 0) {
    return null;
  }
  return <DataTable data={data} columns={columnDef} title={'Entities'} />;
}

function DataTable<T>({
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
    getFacetedUniqueValues: getFacetedUniqueValues(), // for facet values

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
        <div className="text-lg font-bold group-hover:underline">{title}</div>
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



function DataTableBody<T>({ table }: { table: TableType<T> }) {
  "use no memo"
  return (
    <TableBody>
      {table.getRowModel().rows.map((row) => {
        return (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => {
              return (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              );
            })}
          </TableRow>
        );
      })}
    </TableBody>
  );
}
