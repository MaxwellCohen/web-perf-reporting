"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  PaginationCard,
  type PaginatedTable,
} from "@/features/page-speed-insights/tanstack-table-v9/PaginationCard";
import { getPaginationState } from "@/features/page-speed-insights/tanstack-table-v9/tableStateHelpers";

export type PaginatedTableWithRowCount = PaginatedTable & {
  getRowCount: () => number;
  setPageSize: (size: number) => void;
};

export function PaginatedTableControls({
  table,
  defaultPageSize = 10,
  showManualControls,
  className,
}: {
  table: PaginatedTableWithRowCount;
  defaultPageSize?: number;
  showManualControls?: boolean;
  className?: string;
}) {
  const [showAllResults, setShowAllResults] = useState(false);
  const prevPageSizeRef = useRef(defaultPageSize);
  const rowCount = table.getRowCount();
  const pageCount = table.getPageCount();
  const { pageSize } = getPaginationState(table);
  const isShowingAll =
    showAllResults || (pageSize >= rowCount && rowCount > defaultPageSize);
  const canPaginate = rowCount > defaultPageSize || pageCount > 1;
  const showPaginationControls = pageCount > 1 && !isShowingAll;

  if (!canPaginate && !isShowingAll) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {showPaginationControls && <PaginationCard table={table} showManualControls={showManualControls} />}
      {!isShowingAll && (
        <Button
          variant="outline"
          onClick={() => {
            prevPageSizeRef.current = pageSize;
            table.setPageSize(rowCount);
            setShowAllResults(true);
          }}
        >
          Show all results
        </Button>
      )}
      {isShowingAll && (
        <Button
          variant="outline"
          onClick={() => {
            table.setPageSize(prevPageSizeRef.current);
            setShowAllResults(false);
          }}
        >
          Show less results
        </Button>
      )}
    </div>
  );
}
