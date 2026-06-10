"use client";

import { Table, TableBody, TableHeader } from "@/components/ui/table";
import { useTable, type CreateRowModels, type StockFeatures } from "@tanstack/react-table-v9";
import type { TreeMapData, TreeMapNode } from "@/lib/schema";
import { NoResultsRow } from "@/features/page-speed-insights/JSUsage/NoResultsRow";
import { TableControls } from "@/features/page-speed-insights/JSUsage/TableControls";
import { columns } from "@/features/page-speed-insights/JSUsage/jsUsageTableColumns";
import { JSUsageTableHeader } from "@/features/page-speed-insights/JSUsage/jsUsageTableHeader";
import { JSUsageTableRow } from "@/features/page-speed-insights/JSUsage/jsUsageTableRow";
import type { StockColumnDef } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { stockFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";
import { standardTableRowModels } from "@/features/page-speed-insights/tanstack-table-v9/standardRowModels";

export function useUseJSUsageTable(data: TreeMapData["nodes"]) {
  const table = useTable<StockFeatures, TreeMapNode>({
    features: stockFeatures,
    rowModels: standardTableRowModels as unknown as CreateRowModels<StockFeatures, TreeMapNode>,
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
        right: [],
        left: ["expander", "Usage Status", "name", "host"],
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

  return (
    <>
      {depth === 0 ? <TableControls table={table} /> : null}
      <Table className="border-none">
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
    </>
  );
}
