import type { FilterFn, RowData, TableFeatures } from "@tanstack/react-table";

type AppFilterFn = FilterFn<TableFeatures, RowData>;

export const booleanFilterFn: AppFilterFn = (row, columnId, filterValue, _addMeta) => {
  if (!filterValue || !filterValue.length) {
    return true;
  }

  const cellValue = row.getValue(columnId);
  return filterValue.find((value: unknown) => !!value === !!cellValue) !== undefined;
};

/**
 * Standard filter function for string-based filtering (case-insensitive)
 */
const includesStringFilter: AppFilterFn = (row, columnId, filterValue, _addMeta) => {
  const cellValue = String(row.getValue(columnId) || "").toLowerCase();
  const filter = String(filterValue || "").toLowerCase();
  return cellValue.includes(filter);
};

/**
 * Standard filter function for numeric range filtering
 */
const inNumberRangeFilter: AppFilterFn = (row, columnId, filterValue, _addMeta) => {
  const cellValue = Number(row.getValue(columnId)) || 0;
  const [min, max]: [number, number] = filterValue || [0, Infinity];
  return cellValue >= min && cellValue <= max;
};

/**
 * Multi-select style filter: row value is included in the selected filter values (or array overlap).
 */
export const arrIncludesSomeFilter: AppFilterFn = (row, columnId, filterValue, _addMeta) => {
  const selected: unknown[] | undefined = filterValue;
  if (!selected?.length) {
    return true;
  }
  const rowVal = row.getValue(columnId);
  if (Array.isArray(rowVal)) {
    return selected.some((f) => rowVal.includes(f));
  }
  return selected.includes(rowVal);
};

/** Built-in-style string keys for TanStack column `filterFn` */
export const standardFilterFns = {
  booleanFilterFn,
  includesString: includesStringFilter,
  inNumberRange: inNumberRangeFilter,
};
