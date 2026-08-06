import {
  aggregationFns,
  createExpandedRowModel,
  createFacetedMinMaxValues,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createGroupedRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFns,
  sortFns,
  stockFeatures,
  tableFeatures,
} from "@tanstack/react-table";
import {
  arrIncludesSomeFilter,
  booleanFilterFn,
  standardFilterFns,
} from "@/features/page-speed-insights/shared/filterFns";

/**
 * Flat tables: sorting, filtering, faceting (no grouping/pagination/expansion).
 * v9.0+: row models + filter/sort Fns live on `features` via `tableFeatures()`.
 */
export const flatTableFeatures = tableFeatures({
  ...stockFeatures,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  facetedMinMaxValues: createFacetedMinMaxValues(),
  filterFns: {
    ...filterFns,
    ...standardFilterFns,
  },
  sortFns,
});

/**
 * Grouped/paginated tables: sorting, filtering, faceting, grouping, expansion, pagination.
 */
export const standardTableFeatures = tableFeatures({
  ...stockFeatures,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  groupedRowModel: createGroupedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  facetedMinMaxValues: createFacetedMinMaxValues(),
  filterFns: {
    ...filterFns,
    ...standardFilterFns,
  },
  sortFns,
  aggregationFns,
});

/**
 * LH audit accordion tables: filtering, grouping, expansion, faceting (no client sort model).
 */
export const lhTableFeatures = tableFeatures({
  ...stockFeatures,
  filteredRowModel: createFilteredRowModel(),
  groupedRowModel: createGroupedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  filterFns: {
    ...filterFns,
    booleanFilterFn,
    arrIncludesSome: arrIncludesSomeFilter,
  },
  aggregationFns,
});

/**
 * Debug data table: grouping + expansion only.
 */
export const debugDataTableFeatures = tableFeatures({
  ...stockFeatures,
  groupedRowModel: createGroupedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  aggregationFns,
});

export type FlatTableFeatures = typeof flatTableFeatures;
export type StandardTableFeatures = typeof standardTableFeatures;
export type LhTableFeatures = typeof lhTableFeatures;
export type DebugDataTableFeatures = typeof debugDataTableFeatures;

/** @deprecated Prefer flatTableFeatures / standardTableFeatures / lhTableFeatures */
export { stockFeatures };
export type { StockFeatures } from "@tanstack/react-table";
