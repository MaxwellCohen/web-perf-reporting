import { describe, expect, it } from 'vitest';
import {
  createColumnFromHeading,
  getColumnSize,
  getFilterFnForValueType,
} from '@/features/page-speed-insights/shared/tableColumnUtils';

describe('tableColumnUtils', () => {
  it('chooses numeric and string filter functions appropriately', () => {
    expect(getFilterFnForValueType('bytes')).toBe('inNumberRange');
    expect(getFilterFnForValueType('text')).toBe('includesString');
    expect(getFilterFnForValueType(undefined)).toBe('includesString');
    expect(getFilterFnForValueType(42)).toBe('includesString');
  });

  it('sizes columns based on key, label, and value type', () => {
    expect(getColumnSize('url', 'Request URL', 'url')).toBe(300);
    expect(getColumnSize('transferSize', 'Transfer Size', 'bytes')).toBe(120);
    expect(getColumnSize('protocol', 'Protocol', 'text')).toBe(100);
    expect(getColumnSize('resource', 'Resource', 'text')).toBe(150);
  });

  it('builds a table column definition from the heading metadata', () => {
    const heading = {
      key: 'transferSize',
      label: 'Transfer Size',
      valueType: 'bytes',
    } as any;

    expect(createColumnFromHeading(heading)).toEqual({
      id: 'transferSize',
      accessorKey: 'transferSize',
      header: 'Transfer Size',
      size: 120,
      minSize: 50,
      maxSize: 800,
      enableResizing: true,
      filterFn: 'inNumberRange',
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        heading: {
          heading,
        },
      },
    });
  });

  it('falls back to the key when the heading label is not a string', () => {
    const heading = {
      key: 'custom',
      label: { formattedDefault: 'Custom' },
      valueType: 'text',
    } as any;

    expect(createColumnFromHeading(heading).header).toBe('custom');
  });
});
