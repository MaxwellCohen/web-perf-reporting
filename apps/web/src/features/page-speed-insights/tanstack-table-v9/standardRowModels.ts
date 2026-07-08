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
  type CreateRowModels,
  type RowData,
  type StockFeatures,
} from "@tanstack/react-table";
import { booleanFilterFn, standardFilterFns } from "@/features/page-speed-insights/shared/filterFns";

export const standardTableRowModels = {
  filteredRowModel: createFilteredRowModel({
    ...filterFns,
    booleanFilterFn,
    ...standardFilterFns,
  }),
  sortedRowModel: createSortedRowModel(sortFns),
  groupedRowModel: createGroupedRowModel(aggregationFns),
  expandedRowModel: createExpandedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  facetedMinMaxValues: createFacetedMinMaxValues(),
} satisfies CreateRowModels<StockFeatures, RowData>;
