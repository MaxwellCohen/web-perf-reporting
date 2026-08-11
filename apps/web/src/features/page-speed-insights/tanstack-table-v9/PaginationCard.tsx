"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  getPaginationState,
  type TableWithReadableState,
} from "@/features/page-speed-insights/tanstack-table-v9/tableStateHelpers";

export type PaginatedTable = TableWithReadableState & {
  getPageCount: () => number;
  getCanPreviousPage: () => boolean;
  getCanNextPage: () => boolean;
  firstPage: () => void;
  previousPage: () => void;
  nextPage: () => void;
  lastPage: () => void;
  setPageIndex: (index: number) => void;
};

export function PaginationCard({
  table,
  showManualControls,
}: {
  table: PaginatedTable;
  showManualControls?: boolean;
}) {
  const pageCount = table.getPageCount();
  if (pageCount <= 1) {
    return null;
  }
  return (
    <Card className="flex w-full max-w-full flex-wrap items-center gap-2 p-2 sm:w-auto">
      <div className="flex flex-wrap items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => table.firstPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {"<<"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {"<"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {">"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => table.lastPage()}
          disabled={!table.getCanNextPage()}
        >
          {">>"}
        </Button>
      </div>
      {showManualControls ? <PaginationControlsManualPageSelection table={table} /> : null}
    </Card>
  );
}

function PaginationControlsManualPageSelection({ table }: { table: PaginatedTable }) {
  const { pageIndex } = getPaginationState(table);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        Page
        <strong>
          {pageIndex + 1} of {table.getPageCount()}
        </strong>
      </span>
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <span className="text-muted-foreground">Go to</span>
        <Input
          type="number"
          min="1"
          max={table.getPageCount()}
          defaultValue={pageIndex + 1}
          aria-label="Go to page"
          onChange={(e) => {
            const page = e.target.value ? Number(e.target.value) - 1 : 0;
            table.setPageIndex(page);
          }}
          className="h-8 w-14 rounded border px-2 py-1"
        />
      </span>
    </div>
  );
}
