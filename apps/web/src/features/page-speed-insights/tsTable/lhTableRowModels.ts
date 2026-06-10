import {
  aggregationFns,
  createExpandedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createGroupedRowModel,
  filterFns,
  type CreateRowModels,
  type RowData,
  type StockFeatures,
} from "@tanstack/react-table-v9";
import {
  arrIncludesSomeFilter,
  booleanFilterFn,
} from "@/features/page-speed-insights/shared/filterFns";

export const lhTableRowModels = {
  filteredRowModel: createFilteredRowModel({
    ...filterFns,
    booleanFilterFn,
    arrIncludesSome: arrIncludesSomeFilter,
  }),
  groupedRowModel: createGroupedRowModel(aggregationFns),
  expandedRowModel: createExpandedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
} satisfies CreateRowModels<StockFeatures, RowData>;
