import type { RowData } from "@tanstack/react-table";
import {
  useStandardTable,
  type StandardColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";

export type FlatColumnDef<TData extends RowData> = StandardColumnDef<TData>;

export type SimpleTableOptions<TData extends RowData> = {
  data: TData[];
  columns: FlatColumnDef<TData>[];
};

/**
 * Flat TanStack table: sorting, filtering, resize (no expander).
 * Thin wrapper over useStandardTable for call-site clarity.
 */
export function useSimpleTable<TData extends RowData>({
  data,
  columns,
}: SimpleTableOptions<TData>) {
  return useStandardTable({
    data,
    columns,
    enableExpander: false,
  });
}
