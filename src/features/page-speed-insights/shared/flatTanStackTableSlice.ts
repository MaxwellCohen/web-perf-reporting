import {
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import {
  booleanFilterFn,
  standardFilterFns,
} from "@/features/page-speed-insights/shared/filterFns";

/**
 * Shared TanStack Table options for flat tables: sort, filter, faceting, resize.
 * Compose with `data`, `columns`, `state`, and `onSortingChange` / `onColumnFiltersChange`.
 */
export const flatTanStackTableSlice = {
  getCoreRowModel: getCoreRowModel(),
  enableSorting: true,
  getSortedRowModel: getSortedRowModel(),
  enableColumnFilters: true,
  getFilteredRowModel: getFilteredRowModel(),
  getFacetedRowModel: getFacetedRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues(),
  getFacetedMinMaxValues: getFacetedMinMaxValues(),
  enableColumnResizing: true,
  columnResizeMode: "onChange" as const,
  filterFns: {
    booleanFilterFn,
    ...standardFilterFns,
  },
};
