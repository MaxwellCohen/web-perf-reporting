import {
  useTable,
  type CellData,
  type ColumnDef,
  type CreateRowModels,
  type RowData,
} from "@tanstack/react-table";
import {
  stockFeatures,
  type StandardTableFeatures,
} from "@/features/page-speed-insights/tanstack-table-v9/features";
import { flatTableRowModels } from "@/features/page-speed-insights/tanstack-table-v9/rowModels";

export type FlatColumnDef<
  TData extends RowData,
  TValue extends CellData = CellData,
> = ColumnDef<StandardTableFeatures, TData, TValue>;

export type SimpleTableOptions<TData extends RowData> = {
  data: TData[];
  columns: FlatColumnDef<TData>[];
};

/**
 * Flat TanStack Table v9: sorting, filtering, faceting, column resize.
 */
export function useSimpleTable<TData extends RowData>({ data, columns }: SimpleTableOptions<TData>) {
  // v9 owns sort/filter state in TanStack Store. Avoid React useState + onSortingChange
  // here — setOptions runs during render and controlled callbacks can setState mid-render.
  const table = useTable<StandardTableFeatures, TData>({
    features: stockFeatures,
    rowModels: flatTableRowModels as CreateRowModels<StandardTableFeatures, TData>,
    data,
    columns,
    enableSorting: true,
    enableColumnFilters: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
  });

  return table;
}
