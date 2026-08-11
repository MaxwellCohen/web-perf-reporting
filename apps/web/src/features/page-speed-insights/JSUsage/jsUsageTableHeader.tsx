"use client";
import type { CSSProperties } from "react";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { TreeMapNode } from "@/lib/schema";
import type { StockHeader, StockHeaderGroup } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { DataTableHead } from "@/features/page-speed-insights/tanstack-table-v9/DataTableHeader";

const DEPTH_OFFSET_REM = 2.25;

const JS_USAGE_COMPACT_COLUMN_IDS = new Set(["expander", "statusColumn"]);

type JSUsageTableHeaderProps = {
  headerGroup: StockHeaderGroup<TreeMapNode>;
  depth: number;
  i: number;
};

function getHeaderCellStyle(header: StockHeader<TreeMapNode, unknown>): CSSProperties | undefined {
  const size = header.column.getSize();
  if (typeof size !== "number") return undefined;
  return {
    width: `${size}px`,
    minWidth: `${size}px`,
    maxWidth: `${size}px`,
    flexShrink: 0,
  };
}

export function JSUsageTableHeader({ headerGroup, depth, i }: JSUsageTableHeaderProps) {
  const rowKey = `${headerGroup.id}_${i}_${depth}`;
  const style = { "--depthOffset": `${depth * DEPTH_OFFSET_REM}rem` } as CSSProperties;

  return (
    <TableRow
      key={rowKey}
      className={cn(
        "flex h-auto w-max min-w-full border-2 border-l-0 px-0 py-0",
        depth !== 0 && "self-end",
      )}
      style={style}
    >
      {headerGroup.headers.map((header) => (
        <DataTableHead
          key={`${header.id}_${rowKey}`}
          header={header}
          className={cn("min-w-0 border-none", header.column.columnDef.meta?.className)}
          style={getHeaderCellStyle(header)}
          compactColumnIds={JS_USAGE_COMPACT_COLUMN_IDS}
        />
      ))}
    </TableRow>
  );
}
