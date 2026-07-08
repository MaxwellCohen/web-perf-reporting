import {
  createColumnHelper,
  type RowData,
  type StockFeatures,
} from "@tanstack/react-table";

/** v9 `createColumnHelper` with `StockFeatures` pre-bound for PSI tables. */
export function createStockColumnHelper<TData extends RowData>() {
  return createColumnHelper<StockFeatures, TData>();
}

export type StockColumnHelper<TData extends RowData> = ReturnType<
  typeof createStockColumnHelper<TData>
>;
