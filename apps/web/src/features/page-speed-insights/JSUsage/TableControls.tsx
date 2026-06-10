"use client";

import type { StockTable } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import type { RowData } from "@tanstack/react-table-v9";
import { Button } from "@/components/ui/button";
// import { Label } from '@/components/ui/label';s
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useMemo } from "react";
import { getPaginationState } from "@/features/page-speed-insights/tanstack-table-v9/tableStateHelpers";
import { PaginationCard } from "@/features/page-speed-insights/tanstack-table-v9/PaginationCard";

export { PaginationCard };

export function TableControls<T extends RowData>({
  table,
}: {
  table: StockTable<T>;
}) {
  
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

export function ColumnSelector<T extends RowData>({
  table,
}: {
  table: StockTable<T>;
}) {
  
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

export function DropdownFilter<T extends RowData>({
  table,
  columnId,
}: {
  table: StockTable<T>;
  columnId: string;
}) {
  
  const col = table.getColumn(columnId);
  const sortedUniqueValues = useMemo(
    () =>
      Array.from(col?.getFacetedUniqueValues()?.keys() || [])
        .sort()
        .slice(0, 5000),
    [col],
  );
  if (!col) {
    return null;
  }
  const filterValue = (col.getFilterValue() as string[]) || [...sortedUniqueValues];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
        >
          Filter {(col?.columnDef.header as string) || ""} <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {sortedUniqueValues.map((v) => {
          return (
            <DropdownMenuCheckboxItem
              key={v}
              checked={!filterValue || !!filterValue?.find((a) => a === v)}
              onCheckedChange={(checked) => {
                col.setFilterValue((oldValue: string[]) => {
                  const previousValue = oldValue || [...sortedUniqueValues];

                  const newFilter = checked
                    ? [...new Set([...previousValue, v])]
                    : previousValue?.filter((a) => a !== v);
                  return newFilter;
                });
              }}
            >
              {v}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PageSizeSelector<T extends RowData>({
  table,
}: {
  table: StockTable<T>;
}) {
  

  const rowCount = table.getRowCount();
  return (
    <Select
      onValueChange={(e) => {
        table.setPageSize(Number(e) || 10);
      }}
      defaultValue={`${getPaginationState(table).pageSize}`}
    >
      <SelectTrigger className="w-45">
        <SelectValue placeholder="Page Size" />
      </SelectTrigger>
      <SelectContent>
        {[...new Set([rowCount, 10, 20, 30, 40, 50])].map((pageSize) => (
          <SelectItem key={pageSize} value={`${pageSize}`}>
            {pageSize === rowCount ? "All Items in 1 page" : `${pageSize} items on page`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

