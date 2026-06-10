import {
  createFacetedMinMaxValues,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createSortedRowModel,
  filterFns,
  sortFns,
  type CreateRowModels,
  type RowData,
} from "@tanstack/react-table-v9";
import type { StandardTableFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";

export const flatTableRowModels = {
  filteredRowModel: createFilteredRowModel(filterFns),
  sortedRowModel: createSortedRowModel(sortFns),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  facetedMinMaxValues: createFacetedMinMaxValues(),
} satisfies CreateRowModels<StandardTableFeatures, RowData>;
