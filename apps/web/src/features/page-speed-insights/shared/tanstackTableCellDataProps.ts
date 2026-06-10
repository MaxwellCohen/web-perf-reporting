type TableCellLike = {
  id: string;
  column: { id: string };
  getIsGrouped: () => boolean;
  getIsAggregated: () => boolean;
  getIsPlaceholder: () => boolean;
};

type TableRowLike = {
  getCanExpand: () => boolean;
  depth: number;
  getIsExpanded: () => boolean;
};

/** Data attributes used for table cell styling/tests across TanStack table UIs. */
export function tanstackTableCellDataProps(cell: TableCellLike, row: TableRowLike) {
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
