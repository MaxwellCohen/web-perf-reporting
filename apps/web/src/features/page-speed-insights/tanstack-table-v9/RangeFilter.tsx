"use client";
import type { HeaderContext, RowData } from "@tanstack/react-table";
import { RangeFilterInputs } from "@/features/page-speed-insights/JSUsage/jsUsageTableFilters";
import type { StockFeatures } from "@/features/page-speed-insights/shared/tanstackStockTypes";

export function RangeFilter<TData extends RowData>({
  column,
}: Pick<HeaderContext<StockFeatures, TData, unknown>, "column">) {
  return <RangeFilterInputs column={column} />;
}
