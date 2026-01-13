import { ItemValueType } from '@/lib/schema';

/**
 * Value types that can be grouped in tables
 */
export const GROUPABLE_VALUE_TYPES: ItemValueType[] = [
  'code',
  'text',
  'source-location',
  'url',
  'link',
];

/**
 * Value types that should use unique aggregation
 */
export const UNIQUE_AGG_VALUE_TYPES: ItemValueType[] = [
  'code',
  'text',
  'source-location',
  'url',
  'link',
  'thumbnail',
  'node',
];

/**
 * Numeric value types
 */
export const NUMERIC_VALUE_TYPES: ItemValueType[] = [
  'numeric',
  'bytes',
  'ms',
  'timespanMs',
];

/**
 * Default column sizes
 */
export const COLUMN_SIZE_DEFAULT = 125;
export const COLUMN_SIZE_LARGE = 400;
export const EXPANDER_COLUMN_SIZE = 40;
export const DEVICE_COLUMN_SIZE = 110;

/**
 * Separator used for combining item and subitem values
 */
export const DEVICE_LABEL_SEPARATOR = '😠😠';

