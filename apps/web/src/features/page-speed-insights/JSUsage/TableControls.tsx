"use client";

import type { StockTable } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import type { RowData } from "@tanstack/react-table";
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
import { getPaginationState } from "@/features/page-speed-insights/tanstack-table-v9/tableStateHelpers";
import { CopyTableButton } from "@/features/page-speed-insights/tanstack-table-v9/CopyTableButton";
import { PaginatedTableControls } from "@/features/page-speed-insights/tanstack-table-v9/PaginatedTableControls";

export function TableControls<T extends RowData>({ table }: { table: StockTable<T> }) {
  return (
    <div className="mb-3 flex min-w-0 flex-col gap-3 px-1 sm:mb-4 sm:px-0">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => table.resetColumnFilters()}>
          Reset filters
        </Button>
        <Button variant="ghost" size="sm" onClick={() => table.resetSorting()}>
          <span className="sm:hidden">Reset sorting</span>
          <span className="hidden sm:inline">Reset Sorting Order</span>
        </Button>
        <CopyTableButton table={table} variant="ghost" size="sm" aria-label="Copy table">
          <span className="hidden sm:inline" aria-hidden="true">
            Copy table
          </span>
        </CopyTableButton>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <PaginatedTableControls table={table} showManualControls />
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ColumnSelector table={table} />
          <PageSizeSelector table={table} />
        </div>
      </div>
    </div>
  );
}

function ColumnSelector<T extends RowData>({ table }: { table: StockTable<T> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-28 justify-between">
          Columns <ChevronDown className="size-4 opacity-60" />
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

function PageSizeSelector<T extends RowData>({ table }: { table: StockTable<T> }) {
  const rowCount = table.getRowCount();
  return (
    <Select
      onValueChange={(e) => {
        table.setPageSize(Number(e) || 10);
      }}
      defaultValue={`${getPaginationState(table).pageSize}`}
    >
      <SelectTrigger className="h-8 w-auto min-w-28 max-w-full sm:min-w-40">
        <SelectValue placeholder="Page Size" />
      </SelectTrigger>
      <SelectContent>
        {[...new Set([rowCount, 10, 20, 30, 40, 50])].map((pageSize) => (
          <SelectItem key={pageSize} value={`${pageSize}`}>
            {pageSize === rowCount ? "All items" : `${pageSize} per page`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
