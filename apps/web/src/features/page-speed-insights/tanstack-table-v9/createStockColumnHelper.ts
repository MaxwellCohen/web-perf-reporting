import { createColumnHelper, type RowData } from "@tanstack/react-table";

/** v9 `createColumnHelper` — features typed loosely for cross-bundle PSI tables. */
export function createStockColumnHelper<TData extends RowData>() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createColumnHelper<any, TData>();
}

export type StockColumnHelper<TData extends RowData> = ReturnType<
  typeof createStockColumnHelper<TData>
>;
