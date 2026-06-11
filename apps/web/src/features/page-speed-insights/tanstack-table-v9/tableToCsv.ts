import type { Column, RowData } from "@tanstack/react-table-v9";
import type { StockFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";
import type { StockTable } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { escapeCsvCell } from "@/features/page-speed-insights/tanstack-table-v9/csvCell";

const SKIP_COLUMN_IDS = new Set(["expander"]);

function formatCellValue(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (
      value.length > 0 &&
      value.every(
        (entry): entry is [string, unknown] =>
          Array.isArray(entry) && entry.length === 2 && typeof entry[0] === "string",
      )
    ) {
      return value.map(([device, deviceValue]) => `${device}: ${formatCellValue(deviceValue)}`).join(", ");
    }
    return value.map(formatCellValue).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function getColumnHeaderLabel(column: Column<StockFeatures, RowData, unknown>): string {
  const header = column.columnDef.header;
  if (typeof header === "string") {
    return header;
  }

  const meta = column.columnDef.meta as
    | { heading?: { _userLabel?: string; heading?: { key?: string; label?: string } } }
    | undefined;

  if (meta?.heading?._userLabel) {
    return meta.heading._userLabel;
  }
  if (meta?.heading?.heading?.label) {
    return meta.heading.heading.label;
  }
  if (meta?.heading?.heading?.key) {
    return meta.heading.heading.key;
  }

  return column.id;
}

/**
 * Serializes the currently displayed table rows as CSV for clipboard paste.
 */
export function tableToCsv<TData extends RowData>(table: StockTable<TData>): string {
  const columns = table.getVisibleLeafColumns().filter((column) => !SKIP_COLUMN_IDS.has(column.id));
  const headerRow = columns.map((column) => escapeCsvCell(getColumnHeaderLabel(column))).join(",");
  const dataRows = table.getRowModel().rows.map((row) =>
    columns
      .map((column) => escapeCsvCell(formatCellValue(row.getValue(column.id))))
      .join(","),
  );

  return [headerRow, ...dataRows].join("\n");
}
