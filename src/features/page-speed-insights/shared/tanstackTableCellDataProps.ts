import type { Cell, Row } from "@tanstack/react-table";

/** Data attributes used for table cell styling/tests across TanStack table UIs. */
export function tanstackTableCellDataProps<TData, TValue>(
  cell: Cell<TData, TValue>,
  row: Row<TData>,
) {
  return {
    "data-cell-id": cell.id,
    "data-column-id": cell.column.id,
    "data-can-expand": `${row.getCanExpand()}`,
    "data-depth": row.depth,
    "data-row-expanded": `${row.getIsExpanded()}`,
    "data-grouped": `${cell.getIsGrouped()}`,
    "data-aggregated": `${cell.getIsAggregated()}`,
    "data-placeholder": `${cell.getIsPlaceholder()}`,
  } as const;
}
