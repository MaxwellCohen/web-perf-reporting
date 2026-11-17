type PaginationState = {
  pageIndex: number;
  pageSize: number;
};

type ColumnVisibilityState = Record<string, boolean>;

type TableStateAccess = {
  pagination: PaginationState;
  grouping?: string[];
  columnVisibility?: ColumnVisibilityState;
};

export type TableWithReadableState = {
  store?: { state: TableStateAccess };
};

export function getPaginationState(table: TableWithReadableState): PaginationState {
  return table.store!.state.pagination;
}

export function getGroupingState(table: TableWithReadableState): string[] {
  return table.store?.state.grouping ?? [];
}

export function getColumnVisibilityState(table: TableWithReadableState): ColumnVisibilityState {
  return table.store?.state.columnVisibility ?? {};
}
