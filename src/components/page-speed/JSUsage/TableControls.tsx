'use client';
'use no memo';
import { Table as TableType } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';s
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function TableControls<T>({ table }: { table: TableType<T> }) {
  'use no memo';
  // const id = useId();
  return (
    <div className="m-4 flex justify-between">
      <div className="flex flex-row items-end">
        {/* <div className="flex flex-col">
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
        </div> */}
        <Button variant="ghost" onClick={() => table.resetColumnFilters()}>
          Reset filters
        </Button>
        <Button variant="ghost" onClick={() => table.resetSorting()}>
          Reset Sorting Order
        </Button>
      </div>
      <div className="flex flex-row gap-2">
        <PaginationCard table={table} showManualControls />
        <Card className="flex flex-col flex-wrap items-center gap-2 p-2">
          <ColumnSelector table={table} />
          <PageSizeSelector table={table} />
        </Card>
      </div>
    </div>
  );
}

export function ColumnSelector<T>({ table }: { table: TableType<T> }) {
  'use no memo';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
        >
          Columns <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PageSizeSelector<T>({ table }: { table: TableType<T> }) {
  'use no memo';

  const rowCount = table.getRowCount();
  return (
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
            {pageSize === rowCount
              ? 'All Items in 1 page'
              : `${pageSize} items on page`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PaginationCard<T>({
  table,
  showManualControls,
}: {
  table: TableType<T>;
  showManualControls?: boolean;
}) {
  'use no memo';
  const pageCount = table.getPageCount();
  if (pageCount <= 1) {
    return null;
  }
  return (
    <Card className="flex flex-col flex-wrap items-center gap-2 p-2">
      <div className="flex flex-wrap items-center gap-2">
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
      </div>
      {showManualControls ? (
        <PaginationControlsManuelPageSelection table={table} />
      ) : null}
    </Card>
  );
}

export function PaginationControlsManuelPageSelection<T>({
  table,
}: {
  table: TableType<T>;
}) {
  'use no memo';
  return (
    <div className="inline-flex items-center gap-1">
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
    </div>
  );
}
