import type { RowData } from "@tanstack/react-table";
import type { StockTable } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { escapeCsvCell } from "@/features/page-speed-insights/tanstack-table-v9/csvCell";
import { getTableExportData } from "@/features/page-speed-insights/tanstack-table-v9/tableExportData";

/**
 * Serializes the currently displayed table rows as CSV for clipboard paste.
 */
export function tableToCsv<TData extends RowData>(table: StockTable<TData>): string {
  const { headers, rows } = getTableExportData(table);
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];

  return lines.join("\n");
}
