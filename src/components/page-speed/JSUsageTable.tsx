'use client';
import { TreeMapData, TreeMapNode } from '@/lib/schema';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/tableDiv';
import { RenderBytesValue } from './lh-categories/table/RenderTableValue';
import { useId, useState } from 'react';
import {
  CellContext,
  ColumnDef,
  ColumnFiltersState,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  HeaderContext,
  HeaderGroup,
  PaginationState,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
  Table as TableType,
} from '@tanstack/react-table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '@/lib/utils';

function ExpanderCell<T>({ row }: CellContext<T, unknown>) {
  'use no memo';
  return (
    <div className="">
      {row.getCanExpand() ? (
        <Button
          variant={'ghost'}
          size={'icon'}
          className="size-9"
          {...{
            onClick: row.getToggleExpandedHandler(),
            style: { cursor: 'pointer' },
          }}
        >
          {row.getIsExpanded() ? '↓' : '→'}
        </Button>
      ) : (
        <div className="size-9" /> //🔵
      )}
    </div>
  );
}

function RenderBytesCell(info: CellContext<TreeMapNode, unknown>) {
  const value = info.getValue();
  return (
    <div className="w-36 text-right">
      {typeof value === 'number'
        ? RenderBytesValue({
            value,
          })
        : 'N/A'}
    </div>
  );
}

function makeSortingHeading(name: string, classOverrides = '') {
  return function SortingHeader({
    column,
  }: HeaderContext<TreeMapNode, unknown>) {
    'use no memo';
    return (
      <div className={cn('flex w-36 flex-row justify-end', classOverrides)}>
        <Button
          variant="ghost"
          className={`px-0`}
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          aria-label={`Sort column ${name}`}
        >
          <div className="mr-1">{name}</div>
          {column.getIsSorted()
            ? column.getIsSorted() === 'asc'
              ? '↓'
              : '↑'
            : '〰︎'}
        </Button>
      </div>
    );
  };
}

const columns: ColumnDef<TreeMapNode>[] = [
  {
    id: 'expander',
    header: () => <div className=""></div>,
    cell: ExpanderCell,
    enableResizing: false,
    meta: {
      className: 'p-0 flex-shrink-0 flex-grow-0 w-9',
      gridWidth: '2.25rem',
    },
  },
  {
    id: 'usageWarning',
    header: () => <div className=""></div>,
    cell: (info) => <WarningSquare node={info?.row?.original} />,
    enableResizing: false,
    meta: {
      className: 'p-0 flex-shrink-0 flex-grow-0 justify-center',
      gridWidth: '1.5rem',
    },
  },
  {
    accessorKey: 'name',
    accessorFn: ({ name, duplicatedNormalizedModuleName }) =>
      `${name}${duplicatedNormalizedModuleName ? ` -- Duplicated Module` : ''}`,
    enableResizing: false,
    meta: {
      className: '',
      gridWidth: 'minmax(100px, 1fr)',
    },
    header: makeSortingHeading('Name', 'w-unset justify-start'),
    cell: (info) => (
      <div className="overflow-hidden">
        <div className="flex flex-row overflow-x-auto">
          {info.getValue() as string}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'resourceBytes',
    cell: RenderBytesCell,
    enableResizing: false, //disable resizing for just this column
    sortingFn: 'alphanumeric',
    enableSorting: true,
    enableMultiSort: false,
    header: makeSortingHeading('Resource Size'),
    meta: {
      className: '',
      gridWidth: '160px',
    },
  },
  {
    accessorKey: 'unusedBytes',
    cell: RenderBytesCell,
    sortingFn: 'alphanumeric',
    enableSorting: true,
    enableMultiSort: false,
    enableResizing: false, //disable resizing for just this column
    meta: {
      className: '',
      gridWidth: '160px',
    },
    header: makeSortingHeading('Unused Bytes'),
  },
  {
    accessorKey: 'percent',
    accessorFn: ({ resourceBytes, unusedBytes }) => {
      if (
        typeof resourceBytes !== 'number' ||
        typeof unusedBytes !== 'number'
      ) {
        return undefined;
      }
      const percent = (unusedBytes / resourceBytes) * 100;
      return percent;
    },
    cell: (info) => {
      const value = info.getValue();
      return (
        <div className="w-36 text-right">
          {typeof value === 'number' ? `${value.toFixed(2)} %` : 'N/A'}
        </div>
      );
    },
    sortingFn: 'alphanumeric',
    enableResizing: false, //disable resizing for just this column
    meta: {
      className: '',
      gridWidth: '150px',
    },
    enableSorting: true,
    enableMultiSort: false,
    header: makeSortingHeading('Percent'),
  },
];

export function useUseJSUsageTable(data: TreeMapData['nodes']) {
  'use no memo';
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [expanded, setExpanded] = useState<ExpandedState>(true);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const table = useReactTable({
    columns,
    data: data,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getRowCanExpand: (row) => !!row.original.children?.length,
    getSubRows: (row) => (row.children?.length ? row.children : undefined),
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    filterFromLeafRows: true,
    maxLeafRowFilterDepth: 2,
    enableSorting: true,
    rowCount: data.length,
    state: {
      pagination,
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      expanded: expanded,
    },
  });
  return table;
}

export function JSUsageTable({
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
      <Table className="border-r-none max-w-screen table-fixed border-y-2 border-l-2 pr-0 pt-0">
        {depth === 0 ? (
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup, i) => (
              <JSUsageTableHeader
                key={`${headerGroup.id}_${i}_${depth}`}
                headerGroup={headerGroup}
                depth={depth}
                i={i}
              />
            ))}
          </TableHeader>
        ) : null}
        <TableBody className="" suppressHydrationWarning>
          {rows?.length ? (
            rows.map((row, i) => (
              <JSUsageTableRow
                key={`${row.id}_${i}_${depth}`}
                row={row}
                depth={depth}
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

function TableControls<T>({ table }: { table: TableType<T> }) {
  'use no memo';
  const id = useId();
  const rowCount = table.getRowCount();
  return (
    <div className="m-4 flex justify-between">
      <div className="flex flex-row items-end">
        <div className="flex flex-col">
          <Label htmlFor={`filter_${id}`}>Filter</Label>
          <Input
            placeholder="Filter files..."
            id={`filter_${id}`}
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('name')?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
        <Button variant="ghost" onClick={() => table.resetColumnFilters()}>
          Reset filters
        </Button>
        <Button variant="ghost" onClick={() => table.resetSorting()}>
          Reset Sorting Order
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PaginationControls table={table} />
        <Select
          onValueChange={(e) => {
            table.setPageSize(Number(e) || 10);
          }}
          defaultValue={`${table.getState().pagination.pageSize}`}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Page Size" />
          </SelectTrigger>
          <SelectContent>
            {[...new Set([rowCount, 10, 20, 30, 40, 50])].map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                Show {pageSize === rowCount ? 'All' : pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function PaginationControls<T>({ table }: { table: TableType<T> }) {
  'use no memo';
  const pageCount = table.getPageCount();
  if (pageCount <= 1) {
    return null;
  }
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => table.firstPage()}
        disabled={!table.getCanPreviousPage()}
      >
        {'<<'}
      </Button>
      <Button
        variant="ghost"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        {'<'}
      </Button>
      <Button
        variant="ghost"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        {'>'}
      </Button>
      <Button
        variant="ghost"
        onClick={() => table.lastPage()}
        disabled={!table.getCanNextPage()}
      >
        {'>>'}
      </Button>
      <span className="flex items-center gap-1">
        <div>Page</div>
        <strong>
          {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </strong>
      </span>
      <span className="flex items-center gap-1">
        | Go to page:
        <Input
          type="number"
          min="1"
          max={table.getPageCount()}
          defaultValue={table.getState().pagination.pageIndex + 1}
          onChange={(e) => {
            const page = e.target.value ? Number(e.target.value) - 1 : 0;
            table.setPageIndex(page);
          }}
          className="w-16 rounded border p-1"
        />
      </span>
    </>
  );
}

function JSUsageTableHeader({
  headerGroup,
  depth,
  i,
}: {
  headerGroup: HeaderGroup<TreeMapNode>;
  depth: number;
  i: number;
}) {
  'use no memo';

  const gridTemplateColumns = `${headerGroup.headers
    .map((header) => {
      // @ts-expect-error ts is weird here
      return header?.column?.columnDef?.meta?.gridWidth || '1fr';
    })
    .join(' ')}`;

  return (
    <TableRow
      key={`${headerGroup.id}_${i}_${depth}`}
      className="grid w-full"
      data-grid={gridTemplateColumns}
      style={{
        gridTemplateColumns: gridTemplateColumns,
      }}
    >
      {headerGroup.headers.map((header) => {
        return (
          <TableHead
            key={`${header.id}_${i}_${depth}`}
            // @ts-expect-error ts is weird here
            className={`${header.column.columnDef.meta?.className || ''}`}
          >
            {header.isPlaceholder
              ? null
              : flexRender(header.column.columnDef.header, header.getContext())}
          </TableHead>
        );
      })}
    </TableRow>
  );
}

function JSUsageTableRow({
  row,
  depth,
  i,
}: {
  row: Row<TreeMapNode>;
  depth: number;
  i: number;
}) {
  'use no memo';
  const gridTemplateColumns = `${row
    .getVisibleCells()
    .map((cell) => {
      // @ts-expect-error ts is weird here
      return cell.column.columnDef.meta?.gridWidth || '1fr';
    })
    .join(' ')}`;

  return (
    <>
      <TableRow
        className="grid w-full overflow-hidden px-0 py-0"
        data-children={row?.original?.children?.length || 0}
        style={{
          gridTemplateColumns: gridTemplateColumns,
          width: `calc(100% - ${depth * 2.25}rem)`,
          marginLeft: `${depth * 2.25}rem`,
        }}
        suppressHydrationWarning
      >
        {row.getVisibleCells().map((cell) => {
          return (
            <TableCell
              key={`${cell.id}_${i}_${depth}`}
              className={cn(
                `flex flex-row`,
                // @ts-expect-error ts is weird here
                `${cell.column.columnDef.meta?.className || ''}`,
              )}
              suppressHydrationWarning
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          );
        })}
      </TableRow>

      {row.getIsExpanded() && row.subRows ? (
        <JSUsageTableSubRow
          key={`${row.id}_${i}_${depth}_children`}
          data={row.subRows}
          depth={depth + 1}
        />
      ) : null}
    </>
  );
}

function JSUsageTableSubRow({
  data,
  depth = 0,
}: {
  data: Row<TreeMapNode>[];
  depth: number;
}) {
  'use no memo';
  return (
    <>
      {data?.length
        ? data.map((row, i) => (
            <JSUsageTableRow
              key={`${row.id}_${i}_${depth}`}
              row={row}
              depth={depth}
              i={i}
            />
          ))
        : null}
    </>
  );
}

function NoResultsRow() {
  return (
    <TableRow>
      <TableCell className="h-24 w-full text-center">No results.</TableCell>
    </TableRow>
  );
}

function WarningSquare({ node }: { node: TreeMapNode }) {
  const { unusedBytes, resourceBytes = 1 } = node;
  if (!unusedBytes) {
    return (
      <div className="h-3 w-3 self-center rounded-full bg-gray-500">
        <span className="sr-only">unused JS not reported</span>
      </div>
    );
  }
  const percent = (unusedBytes / resourceBytes) * 100;

  if (percent > 90) {
    return (
      <div className="h-3 w-3 self-center rounded-full bg-red-500">
        <span className="sr-only">
          warning this function could have extra JS
        </span>
      </div>
    );
  }
  if (percent > 25) {
    return (
      <div className="h-3 w-3 self-center rounded-full bg-yellow-500">
        <span className="sr-only">
          warning this function could have extra JS
        </span>
      </div>
    );
  }
  return (
    <div className="h-3 w-3 self-center rounded-full border-2 bg-green-500">
      <span className="sr-only">unused JS not reported</span>
    </div>
  );
}
