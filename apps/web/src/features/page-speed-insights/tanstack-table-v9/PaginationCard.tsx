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
    <Card className="flex flex-col flex-wrap items-center gap-2 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => table.firstPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {"<<"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {"<"}
        </Button>
        <Button variant="ghost" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          {">"}
        </Button>
        <Button variant="ghost" onClick={() => table.lastPage()} disabled={!table.getCanNextPage()}>
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
    <div className="inline-flex items-center gap-1">
      <span className="flex items-center gap-1">
        <div>Page</div>
        <strong>
          {pageIndex + 1} of {table.getPageCount()}
        </strong>
      </span>
      <span className="flex items-center gap-1">
        | Go to page:
        <Input
          type="number"
          min="1"
          max={table.getPageCount()}
          defaultValue={pageIndex + 1}
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
