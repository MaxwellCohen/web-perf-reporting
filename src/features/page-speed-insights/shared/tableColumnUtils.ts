import type { TableColumnHeading, ItemValueType } from '@/lib/schema';

/**
 * Determines the appropriate filter function based on value type
 */
export function getFilterFnForValueType(
  valueType?: ItemValueType | string | number,
): 'includesString' | 'inNumberRange' | undefined {
  if (!valueType || typeof valueType !== 'string') {
    return 'includesString';
  }

  // Numeric types
  if (['numeric', 'bytes', 'timespanMs', 'ms'].includes(valueType)) {
    return 'inNumberRange';
  }

  // String types
  if (['code', 'url', 'text', 'link', 'source-location'].includes(valueType)) {
    return 'includesString';
  }

  // Default to string filter for unknown types
  return 'includesString';
}

/**
 * Determines the initial column size based on key, label, and value type
 */
export function getColumnSize(
  key: string,
  label: string,
  valueType?: ItemValueType | string | number,
): number {
  // URL columns need more space
  if (key === 'url' || label.toLowerCase().includes('url')) {
    return 300;
  }

  // Numeric columns are typically narrower
  if (valueType && typeof valueType === 'string') {
    if (['bytes', 'numeric', 'timespanMs', 'ms'].includes(valueType)) {
      return 120;
    }
    if (['protocol', 'mime'].some((term) => label.toLowerCase().includes(term))) {
      return 100;
    }
  }

  // Default size
  return 150;
}

/**
 * Creates a column definition from a TableColumnHeading
 */
export function createColumnFromHeading<T>(
  heading: TableColumnHeading,
): {
  id: string;
  accessorKey: string;
  header: string;
  size: number;
  minSize: number;
  maxSize: number;
  enableResizing: boolean;
  filterFn?: 'includesString' | 'inNumberRange';
  enableSorting: boolean;
  enableColumnFilter: boolean;
  meta: {
    heading: {
      heading: TableColumnHeading;
    };
  };
} {
  const key = heading.key || '';
  const label = typeof heading.label === 'string' ? heading.label : key;
  const valueType = heading.valueType;
  const filterFn = getFilterFnForValueType(valueType);
  const initialSize = getColumnSize(key, label, valueType);

  return {
    id: key,
    accessorKey: key,
    header: label,
    size: initialSize,
    minSize: 50,
    maxSize: 800,
    enableResizing: true,
    ...(filterFn && { filterFn }),
    enableSorting: true,
    enableColumnFilter: true,
    meta: {
      heading: {
        heading,
      },
    },
  };
}

