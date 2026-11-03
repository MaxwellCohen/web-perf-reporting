"use client";
import { useTable, type RowData } from "@tanstack/react-table";
import type { StockAnyColumnDef } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { standardTableFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";
import { ExpandAll, ExpandRow } from "@/features/page-speed-insights/JSUsage/jsUsageTableParts";

export type StandardColumnDef<TData extends RowData> = StockAnyColumnDef<TData>;

export type TableConfigOptions<TData extends RowData> = {
  data: TData[];
  columns: StandardColumnDef<TData>[];
  grouping?: string[];
  enablePagination?: boolean;
  defaultPageSize?: number;
  initialSorting?: { id: string; desc: boolean }[];
  /**
   * When true, injects the expander column (hidden by default via columnVisibility).
   * Defaults to true when grouping is set, otherwise false.
   */
  enableExpander?: boolean;
};

/**
 * Grouped TanStack Table v9: sorting, filtering, faceting, resize, grouping, pagination.
 * State lives in TanStack Store (no React useState + onXChange — that can setState during render).
 */
export function useStandardTable<TData extends RowData>({
  data,
  columns,
  grouping = [],
  enablePagination = false,
  defaultPageSize = 10,
  enableExpander = grouping.length > 0,
  initialSorting,
}: TableConfigOptions<TData>) {
  const expanderColumn: StandardColumnDef<TData> = {
    id: "expander",
    header: ({ table }) => <ExpandAll table={table} />,
    cell: ExpandRow,
    aggregatedCell: ExpandRow,
    size: 40,
    enableHiding: true,
    enableGrouping: false,
    enablePinning: true,
    enableSorting: false,
    enableResizing: true,
  };
  const tableColumns = enableExpander ? [expanderColumn, ...columns] : columns;

  const table = useTable({
    features: standardTableFeatures,
    data,
    columns: tableColumns,
    enableSorting: true,
    enableColumnFilters: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    enableExpanding: enableExpander,
    getRowCanExpand: () => false,
    filterFromLeafRows: true,
    initialState: {
      grouping,
      columnVisibility: {
        ...(enableExpander ? { expander: false } : {}),
        label: false,
      },
      ...(enablePagination && {
        pagination: {
          pageIndex: 0,
          pageSize: defaultPageSize,
        },
      }),
      ...(initialSorting?.length ? { sorting: initialSorting } : {}),
    },
  });

  return table;
}
