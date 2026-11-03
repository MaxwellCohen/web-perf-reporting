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
  standardFilterFns,
} from "@/features/page-speed-insights/shared/filterFns";

/**
 * Shared by every PSI table (standard, LH audit accordion, debug data): sorting, filtering,
 * faceting, grouping, expansion, pagination. Row models only run when the table opts in via state.
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
    arrIncludesSome: arrIncludesSomeFilter,
  },
  sortFns,
  aggregationFns,
});
