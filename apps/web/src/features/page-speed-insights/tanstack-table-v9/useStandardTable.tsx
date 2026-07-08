"use client";
import { useMemo } from "react";
import {
  useTable,
  type ColumnDef,
  type CreateRowModels,
  type RowData,
} from "@tanstack/react-table";
import {
  stockFeatures,
  type StandardTableFeatures,
} from "@/features/page-speed-insights/tanstack-table-v9/features";
import { standardTableRowModels } from "@/features/page-speed-insights/tanstack-table-v9/standardRowModels";
import { ExpandAll, ExpandRow } from "@/features/page-speed-insights/JSUsage/jsUsageTableParts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixed accessor TValue per column
export type StandardColumnDef<TData extends RowData, TValue = any> = ColumnDef<
  StandardTableFeatures,
  TData,
  TValue
>;

export type TableConfigOptions<TData extends RowData> = {
  data: TData[];
  columns: StandardColumnDef<TData>[];
  grouping?: string[];
  enablePagination?: boolean;
  defaultPageSize?: number;
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
}: TableConfigOptions<TData>) {
  const tableColumns = useMemo<StandardColumnDef<TData>[]>(
    () => [
      {
        id: "expander",
        header: (props) => <ExpandAll table={props.table as never} />,
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
    ],
    [columns],
  );

  const table = useTable<StandardTableFeatures, TData>({
    features: stockFeatures,
    rowModels: standardTableRowModels as CreateRowModels<StandardTableFeatures, TData>,
    data,
    columns: tableColumns,
    enableSorting: true,
    enableColumnFilters: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    enableExpanding: true,
    getRowCanExpand: () => false,
    filterFromLeafRows: true,
    initialState: {
      grouping,
      columnVisibility: {
        expander: false,
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
