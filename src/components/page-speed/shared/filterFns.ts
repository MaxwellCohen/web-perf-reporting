import { FilterFn } from '@tanstack/react-table';

/**
 * Standard filter function for string-based filtering (case-insensitive)
 */
export const includesStringFilter: FilterFn<unknown> = (row, columnId, filterValue) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cellValue = String((row as any).getValue(columnId) || '').toLowerCase();
  const filter = String(filterValue || '').toLowerCase();
  return cellValue.includes(filter);
};

/**
 * Standard filter function for numeric range filtering
 */
export const inNumberRangeFilter: FilterFn<unknown> = (row, columnId, filterValue) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cellValue = Number((row as any).getValue(columnId)) || 0;
  const [min, max] = (filterValue as [number, number]) || [0, Infinity];
  return cellValue >= min && cellValue <= max;
};

/**
 * Standard filter functions object for use in TanStack Table
 */
export const standardFilterFns = {
  includesString: includesStringFilter,
  inNumberRange: inNumberRangeFilter,
} as Record<string, FilterFn<unknown>>;

