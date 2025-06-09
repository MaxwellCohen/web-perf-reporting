import { useId, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Entities } from '@/lib/schema';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  Header,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { renderBoolean } from './lh-categories/renderBoolean';
import { Button } from '../ui/button';

const columnHelper = createColumnHelper<NonNullable<Entities[number]>>();

const columnDef = [
  columnHelper.accessor('name', {
    header: 'Name',
    // enable sorting
    sortingFn: 'alphanumeric',
  }),
  columnHelper.accessor((r) => r.isFirstParty, {
    header: 'Is First Party',
    cell: ({ getValue }) => {
      return renderBoolean(!!getValue());
    },
  }),
  columnHelper.accessor('isUnrecognized', {
    header: 'Is Unrecognized',
    cell: ({ getValue }) => {
      return renderBoolean(!!getValue());
    },
  }),
  columnHelper.accessor('origins', {
    header: 'Origins',
    enableSorting: false,
    cell: ({ getValue }) => {
      return getValue().map((o, i) => <div key={`${i}-${o}`}>{o} </div>);
    },
  }),
];

export function EntitiesTable({ entities = [] }: { entities?: Entities }) {
  'use no memo';
  const id = useId();
  const data = useMemo(() => {
    return (entities || [])?.filter(
      (v): v is NonNullable<Entities[number]> => !!v,
    );
  }, [entities]);
  console.log('columnDef', columnDef);

  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    columns: columnDef,
    data,
    getCoreRowModel: getCoreRowModel(),

    // sorting,
    enableSorting: true,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),

    state: {
      sorting,
    },
  });

  console.log(table);
  if (!entities?.length) {
    return null;
  }

  return (
    <AccordionItem value={'EntitiesTable'}>
      <AccordionTrigger>
        <div className="text-lg font-bold group-hover:underline">Entities</div>
      </AccordionTrigger>
      <AccordionContent>
        <Table aria-labelledby={`${id}-entities-title`}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => {
              return (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        <div className="flex flex-row items-center justify-between py-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <div>
                            <SortingButton header={header} />
                          </div>
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              return (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </AccordionContent>
    </AccordionItem>
  );
}

function SortingButton<T>({ header }: { header: Header<T, unknown> }) {
  if (!header.column.getCanSort()) {
    return null;
  }
  return (
    <Button
      type="button"
      variant={'ghost'}
      size={'icon'}
      onClick={header.column.getToggleSortingHandler()}
      title={
        header.column.getNextSortingOrder() === 'asc'
          ? 'Sort ascending'
          : header.column.getNextSortingOrder() === 'desc'
            ? 'Sort descending'
            : 'Clear sort'
      }
    >
      {{
        asc: '↑',
        desc: '↓',
      }[header.column.getIsSorted() as string] ?? '〰︎'}
    </Button>
  );
}
