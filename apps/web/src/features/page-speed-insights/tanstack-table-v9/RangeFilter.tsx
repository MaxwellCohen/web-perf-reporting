"use client";
import type { HeaderContext, RowData } from "@tanstack/react-table";
import { RangeFilterInputs } from "@/features/page-speed-insights/JSUsage/jsUsageTableFilters";
import type { StandardTableFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";

export function RangeFilter<TData extends RowData>({
  column,
}: Pick<HeaderContext<StandardTableFeatures, TData, unknown>, "column">) {
  return <RangeFilterInputs column={column} />;
}
