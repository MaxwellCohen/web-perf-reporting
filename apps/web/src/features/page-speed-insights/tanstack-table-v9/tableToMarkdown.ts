import type { RowData } from "@tanstack/react-table";
import type { StockTable } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { rowsToMarkdown } from "@/features/page-speed-insights/tanstack-table-v9/rowsToMarkdown";
import { getTableExportData } from "@/features/page-speed-insights/tanstack-table-v9/tableExportData";

/**
 * Serializes the currently displayed table rows as a Markdown table for clipboard paste.
 */
export function tableToMarkdown<TData extends RowData>(table: StockTable<TData>): string {
  const { headers, rows } = getTableExportData(table);
  return rowsToMarkdown([headers, ...rows]);
}
