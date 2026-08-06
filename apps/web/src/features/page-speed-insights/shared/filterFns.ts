import type { FilterFn } from "@tanstack/react-table";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppFilterFn = FilterFn<any, any>;

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
export const includesStringFilter: AppFilterFn = (row, columnId, filterValue, _addMeta) => {
  const cellValue = String(row.getValue(columnId) || "").toLowerCase();
  const filter = String(filterValue || "").toLowerCase();
  return cellValue.includes(filter);
};

/**
 * Standard filter function for numeric range filtering
 */
export const inNumberRangeFilter: AppFilterFn = (row, columnId, filterValue, _addMeta) => {
  const cellValue = Number(row.getValue(columnId)) || 0;
  const [min, max] = (filterValue as [number, number]) || [0, Infinity];
  return cellValue >= min && cellValue <= max;
};

/**
 * Multi-select style filter: row value is included in the selected filter values (or array overlap).
 */
export const arrIncludesSomeFilter: AppFilterFn = (row, columnId, filterValue, _addMeta) => {
  const selected = filterValue as unknown[] | undefined;
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
