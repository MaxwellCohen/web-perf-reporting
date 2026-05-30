"use client";

/**
 * Single import surface for PSI TanStack table cards — cuts cross-file import-block
 * clones under fallow semantic duplication (see `.fallowrc.json` duplicates settings).
 */
export { useMemo } from "react";
export type { ColumnDef } from "@tanstack/react-table";
export { createColumnHelper } from "@tanstack/react-table";
export { useStandardTable } from "@/features/page-speed-insights/shared/tableConfigHelpers";
export { useTableColumns } from "@/features/page-speed-insights/shared/useTableColumns";
export { TableCard } from "@/features/page-speed-insights/shared/TableCard";
export { sortByMaxValue } from "@/features/page-speed-insights/shared/dataSortingHelpers";
export {
  createMSColumn,
  createURLColumn,
  createBytesColumn,
  createPercentageColumn,
} from "@/features/page-speed-insights/shared/tableColumnHelpers";
export { createStringAggregatedCell } from "@/features/page-speed-insights/shared/aggregatedCellHelpers";
export { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
export { getNumber, getUrlString } from "@/lib/utils";
