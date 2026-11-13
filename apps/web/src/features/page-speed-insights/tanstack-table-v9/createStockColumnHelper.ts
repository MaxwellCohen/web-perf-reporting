import { createColumnHelper, type RowData, type TableFeatures } from "@tanstack/react-table";
import type { StockFeatures } from "@/features/page-speed-insights/shared/tanstackStockTypes";

/** v9 `createColumnHelper` bound to the default PSI feature bundle (override via `TFeatures`). */
export function createStockColumnHelper<
  TData extends RowData,
  TFeatures extends TableFeatures = StockFeatures,
>() {
  return createColumnHelper<TFeatures, TData>();
}
