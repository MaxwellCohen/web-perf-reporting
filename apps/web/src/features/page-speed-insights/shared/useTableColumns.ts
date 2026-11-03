import type { RowData } from "@tanstack/react-table";
import type { StockAnyColumnDef } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { createReportColumn } from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";

/**
 * Hook to conditionally add a report column to table columns based on showReportColumn flag.
 * Follows the pattern used in BootupTimeCard where base columns are defined separately
 * and the report column is conditionally added.
 */
export function useTableColumns<T extends { label: string } & RowData>(
  baseColumns: StockAnyColumnDef<T>[],
  columnHelper: ReturnType<typeof createStockColumnHelper<T>>,
  showReportColumn: boolean,
): StockAnyColumnDef<T>[] {
  if (showReportColumn) {
    return [...baseColumns, createReportColumn(columnHelper)];
  }
  return baseColumns;
}
