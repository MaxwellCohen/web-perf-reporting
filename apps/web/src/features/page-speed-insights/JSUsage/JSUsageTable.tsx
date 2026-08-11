"use client";

import { Table, TableBody, TableHeader } from "@/components/ui/table";
import { useTable } from "@tanstack/react-table";
import type { TreeMapData, TreeMapNode } from "@/lib/schema";
import { NoResultsRow } from "@/features/page-speed-insights/JSUsage/NoResultsRow";
import { TableControls } from "@/features/page-speed-insights/JSUsage/TableControls";
import { columns } from "@/features/page-speed-insights/JSUsage/jsUsageTableColumns";
import { JSUsageTableHeader } from "@/features/page-speed-insights/JSUsage/jsUsageTableHeader";
import { JSUsageTableRow } from "@/features/page-speed-insights/JSUsage/jsUsageTableRow";
import type { StockColumnDef } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { standardTableFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";

export function useUseJSUsageTable(data: TreeMapData["nodes"]) {
  const table = useTable({
    features: standardTableFeatures,
    columns: columns as StockColumnDef<TreeMapNode>[],
    data,
    getSubRows: (row) => (row.children?.length ? row.children : undefined),
    enableExpanding: true,
    enableSubRowSelection: true,
    enableSorting: true,
    enableColumnFilters: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    initialState: {
      columnPinning: {
        end: [],
        start: ["expander", "Usage Status", "name", "host"],
      },
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
      columnVisibility: {
        host: false,
      },
      rowSelection: {},
      grouping: ["host"],
      expanded: {},
    },
  });

  return table;
}

export function JSUsageTableWithControls({
  data,
  depth = 0,
}: {
  data: TreeMapData["nodes"];
  label?: string;
  depth?: number;
}) {
  const table = useUseJSUsageTable(data);
  const rows = table.getRowModel().rows;

  const tableWidth = table.getTotalSize();

  return (
    <div className="w-full min-w-0">
      {depth === 0 ? <TableControls table={table} /> : null}
      <Table
        className="border-none"
        wrapperClassName="min-w-0"
        style={{ width: tableWidth, minWidth: "100%" }}
      >
        <TableHeader className="" suppressHydrationWarning>
          {table.getHeaderGroups().map((headerGroup, i) => (
            <JSUsageTableHeader
              key={`${headerGroup.id}_${i}_${depth}`}
              headerGroup={headerGroup}
              depth={depth}
              i={i}
            />
          ))}
        </TableHeader>
        <TableBody className="flex flex-col border-0" suppressHydrationWarning>
          {rows?.length ? (
            rows.map((row, i) => (
              <JSUsageTableRow key={`${row.id}_${i}_${depth}`} row={row} i={i} />
            ))
          ) : (
            <NoResultsRow />
          )}
        </TableBody>
      </Table>
    </div>
  );
}
