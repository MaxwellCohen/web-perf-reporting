import {
  type CellData,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import {
  useStandardTable,
  type StandardColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";

export type FlatColumnDef<
  TData extends RowData,
  TValue extends CellData = CellData,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
> = ColumnDef<any, TData, TValue>;

export type SimpleTableOptions<TData extends RowData> = {
  data: TData[];
  columns: FlatColumnDef<TData>[];
};

/**
 * Flat TanStack table: sorting, filtering, resize (no expander).
 * Thin wrapper over useStandardTable for call-site clarity.
 */
export function useSimpleTable<TData extends RowData>({ data, columns }: SimpleTableOptions<TData>) {
  return useStandardTable({
    data,
    columns: columns as StandardColumnDef<TData>[],
    enableExpander: false,
  });
}
