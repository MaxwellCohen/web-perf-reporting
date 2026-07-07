"use client";
import type { CSSProperties } from "react";
import { TableRow, TableHead } from "@/components/ui/table";
import { flexRender } from "@tanstack/react-table-v9";
import { cn } from "@/lib/utils";
import type { TreeMapNode } from "@/lib/schema";
import type { StockHeader, StockHeaderGroup } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { SortingButton } from "@/features/page-speed-insights/tanstack-table-v9/sortingButton";
import { FilterPopover } from "@/features/page-speed-insights/tanstack-table-v9/DataTableHeader";
import { ColumnResizer } from "@/features/page-speed-insights/tanstack-table-v9/columnResizer";

const DEPTH_OFFSET_REM = 2.25;

type JSUsageTableHeaderProps = {
  headerGroup: StockHeaderGroup<TreeMapNode>;
  depth: number;
  i: number;
};

function getHeaderCellStyle(header: StockHeader<TreeMapNode, unknown>): CSSProperties | undefined {
  const size = header.column.getSize();
  return typeof size === "number" ? { width: `${size}px` } : undefined;
}

function JSUsageTableHead({
  header,
  rowKey,
}: {
  header: StockHeader<TreeMapNode, unknown>;
  rowKey: string;
}) {
  const isExpanderColumn = header.column.id === "expander";
  const isStatusColumn = header.column.id === "statusColumn";

  return (
    <TableHead
      key={`${header.id}_${rowKey}`}
      className={cn(
        "relative min-w-0 overflow-hidden border-none",
        header.column.columnDef.meta?.className,
      )}
      style={getHeaderCellStyle(header)}
    >
      {isExpanderColumn || isStatusColumn ? (
        <div className="flex items-center justify-center py-1">
          {flexRender(header.column.columnDef.header, header.getContext())}
        </div>
      ) : (
        <>
          <div className="flex min-w-0 flex-row flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="min-w-0 flex-1 overflow-hidden text-ellipsis *:truncate">
              {flexRender(header.column.columnDef.header, header.getContext())}
            </div>
            <div className="flex shrink-0 flex-row items-center gap-1">
              <SortingButton header={header} />
              <FilterPopover header={header} />
            </div>
          </div>
          <ColumnResizer header={header} />
        </>
      )}
    </TableHead>
  );
}

export function JSUsageTableHeader({ headerGroup, depth, i }: JSUsageTableHeaderProps) {
  const rowKey = `${headerGroup.id}_${i}_${depth}`;
  const style = { "--depthOffset": `${depth * DEPTH_OFFSET_REM}rem` } as CSSProperties;

  return (
    <TableRow
      key={rowKey}
      className={cn(
        "flex h-auto w-full overflow-hidden border-2 border-l-0 px-0 py-0",
        depth !== 0 && "self-end",
      )}
      style={style}
    >
      {headerGroup.headers.map((header) => (
        <JSUsageTableHead key={`${header.id}_${rowKey}`} header={header} rowKey={rowKey} />
      ))}
    </TableRow>
  );
}
