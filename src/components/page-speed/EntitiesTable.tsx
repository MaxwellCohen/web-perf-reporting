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
  ColumnFiltersState,
  createColumnHelper,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  Header,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { renderBoolean } from './lh-categories/renderBoolean';
import { SortingButton } from './lh-categories/table/sortingButton';
import { Popover } from '../ui/popover';
import { PopoverContent, PopoverTrigger } from '@radix-ui/react-popover';
import { ListFilter } from 'lucide-react';
import { Button } from '../ui/button';
import { StringFilterHeader } from './JSUsage/JSUsageTable';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import {
  ColumnResizer,
} from './lh-categories/table/columnResizer';

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
    cell: ({ getValue }) => {
      return renderBoolean(!!getValue());
    },
    enableResizing: true,
    minSize: 200,
  }),
  columnHelper.accessor('isUnrecognized', {
    header: 'Is Unrecognized',
    filterFn: 'booleanFilterFn',
    cell: ({ getValue }) => {
      return renderBoolean(!!getValue());
    },
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
  "use no memo"
  const id = useId();
  const data = useMemo(() => {
    return (entities || [])?.filter(
      (v): v is NonNullable<Entities[number]> => !!v,
    );
  }, [entities]);
  console.log('columnDef', columnDef);

  const [sorting, setSorting] = useState<SortingState>([]);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    columns: columnDef,
    data,
    getCoreRowModel: getCoreRowModel(),

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
  
  if (!entities?.length) {
    return null;
  }
  
  return (
    <AccordionItem value={'EntitiesTable'}>
      <AccordionTrigger>
        <div className="text-lg font-bold group-hover:underline">Entities</div>
      </AccordionTrigger>
      <AccordionContent>
        <Table
          aria-labelledby={`${id}-entities-title`}
          className="table-fixed"
          style={{
            // ...columnSizeVars, //Define column sizes on the <table> element
            width: table.getTotalSize(),
          }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => {
              return (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        className="relative"
                        style={{
                          width: `${header.getSize()}px` //`calc(var(--header-${header?.id}-size) * 1px)`,
                        }}
                      >
                        <div className="flex flex-row items-center justify-between py-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <div>
                            <SortingButton header={header} />
                            <FilterPopover header={header} />
                          </div>
                        </div>
                        <ColumnResizer header={header} />
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

function FilterPopover<T>({ header }: { header: Header<T, unknown> }) {
  if (!header.column.getCanFilter()) {
    return null;
  }
  const filterType = header.column.columnDef.filterFn;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant={'ghost'} size={'icon'}>
          <ListFilter />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex flex-col rounded-sm border border-muted-foreground/30 bg-black p-4">
          {filterType === 'includesString' ? (
            <StringFilterHeader column={header.column} name={''} />
          ) : null}
          {filterType === 'booleanFilterFn' ? (
            <CheckBoxFilter header={header} />
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CheckBoxFilter<T>({ header }: { header: Header<T, unknown> }) {
  const col = header.column;
  const sortedUniqueValues = useMemo(
    () =>
      Array.from(col?.getFacetedUniqueValues()?.keys() || [])
        .sort()
        .slice(0, 5000),
    [col],
  );
  const filterValue = (col.getFilterValue() as string[]) || [
    ...sortedUniqueValues,
  ];

  return (
    <div className="flex flex-col gap-2 overflow-scroll max-h-10">
      {sortedUniqueValues.map((v) => {
        return (
          <Label key={`${v}`} className="flex flex-row items-center gap-3">
            <Checkbox
              checked={
                filterValue.length
                  ? filterValue.findIndex((a) => !!a === !!v) > -1
                  : true
              }
              onCheckedChange={(checked) => {
                col.setFilterValue((oldValue: string[]) => {
                  const previousValue = [
                    ...oldValue,
                    ...(oldValue.length ? [] : sortedUniqueValues),
                  ];

                  const newFilter = checked
                    ? [...new Set([...previousValue, !!v])]
                    : previousValue?.filter((a) => !!a !== !!v);
                  return newFilter;
                });
              }}
            ></Checkbox>
            {typeof v === 'string' ? v : renderBoolean(!!v)}
          </Label>
        );
      })}
    </div>
  );
}
