"use client";
import { useTable, type ColumnDef, type RowData } from "@tanstack/react-table";
import { standardTableFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";
import { ExpandAll, ExpandRow } from "@/features/page-speed-insights/JSUsage/jsUsageTableParts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixed accessor TValue per column
export type StandardColumnDef<TData extends RowData, TValue = any> = ColumnDef<any, TData, TValue>;

export type TableConfigOptions<TData extends RowData> = {
  data: TData[];
  columns: StandardColumnDef<TData>[];
  grouping?: string[];
  enablePagination?: boolean;
  defaultPageSize?: number;
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
}: TableConfigOptions<TData>) {
  const tableColumns = enableExpander
    ? [
        {
          id: "expander",
          header: (props: { table: unknown }) => <ExpandAll table={props.table as never} />,
          cell: ExpandRow as unknown as StandardColumnDef<TData>["cell"],
          aggregatedCell: ExpandRow as unknown as StandardColumnDef<TData>["aggregatedCell"],
          size: 40,
          enableHiding: true,
          enableGrouping: false,
          enablePinning: true,
          enableSorting: false,
          enableResizing: true,
        },
        ...columns,
      ]
    : columns;

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
    },
  });

  return table;
}
