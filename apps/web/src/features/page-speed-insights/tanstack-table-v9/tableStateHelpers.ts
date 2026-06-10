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

/** TanStack v8 exposes `getState()`; v9 uses `store.state`. */
export type TableWithReadableState = {
  getState?: () => TableStateAccess;
  store?: { state: TableStateAccess };
};

export function getPaginationState(table: TableWithReadableState): PaginationState {
  if (typeof table.getState === "function") {
    return table.getState().pagination;
  }
  return table.store!.state.pagination;
}

export function getGroupingState(table: TableWithReadableState): string[] {
  if (typeof table.getState === "function") {
    return table.getState().grouping ?? [];
  }
  return table.store?.state.grouping ?? [];
}

export function getColumnVisibilityState(table: TableWithReadableState): ColumnVisibilityState {
  if (typeof table.getState === "function") {
    return table.getState().columnVisibility ?? {};
  }
  return table.store?.state.columnVisibility ?? {};
}
