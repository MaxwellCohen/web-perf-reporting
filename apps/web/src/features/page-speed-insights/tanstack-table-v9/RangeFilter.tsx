"use client";
import type { HeaderContext, RowData } from "@tanstack/react-table";
import { RangeFilterInputs } from "@/features/page-speed-insights/JSUsage/jsUsageTableFilters";

export function RangeFilter<TData extends RowData>({
  column,
}: Pick<HeaderContext<any, TData, unknown>, "column">) {
  return <RangeFilterInputs column={column} />;
}
