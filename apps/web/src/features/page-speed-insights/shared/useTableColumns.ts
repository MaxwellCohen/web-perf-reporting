import { useMemo } from "react";
import type { RowData } from "@tanstack/react-table-v9";
import type { StockColumnDef } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { createReportColumn } from "@/features/page-speed-insights/shared/tableColumnHelpers";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";

/**
 * Hook to conditionally add a report column to table columns based on showReportColumn flag.
 * Follows the pattern used in BootupTimeCard where base columns are defined separately
 * and the report column is conditionally added.
 */
export function useTableColumns<T extends { label: string } & RowData>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack column TValue varies per accessor; unknown is too narrow for mixed columns
  baseColumns: StockColumnDef<T, any>[],
  columnHelper: ReturnType<typeof createStockColumnHelper<T>>,
  showReportColumn: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): StockColumnDef<T, any>[] {
  return useMemo(() => {
    if (showReportColumn) {
      return [...baseColumns, createReportColumn(columnHelper)];
    }
    return baseColumns;
  }, [baseColumns, columnHelper, showReportColumn]);
}
