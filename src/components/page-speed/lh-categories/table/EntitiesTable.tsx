'use client';
import { useMemo } from 'react';
import { Entities } from '@/lib/schema';
import {
  CellContext,
  createColumnHelper,
  FilterFn,
} from '@tanstack/react-table';
import { renderBoolean } from '../renderBoolean';
import { DataTableNoGrouping } from './DataTableNoGrouping';

declare module '@tanstack/react-table' {
  interface FilterFns {
    booleanFilterFn: FilterFn<unknown>;
  }
}

function BooleanCell<T>(info: CellContext<T, boolean>) {
  return renderBoolean(!!info.getValue());
}

const columnHelper = createColumnHelper<NonNullable<Entities[number]>>();

const columnDef = [
  columnHelper.accessor('name', {
    header: 'Name',
    // enable sorting
    sortingFn: 'alphanumeric',
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
  return <DataTableNoGrouping data={data} columns={columnDef} title={'Entities'} />;
}
