import { describe, expect, it } from 'vitest';
import {
  getEntityGroupItems,
  getTableItemSortComparator,
  shouldGroupEntity,
} from '@/features/page-speed-insights/lh-categories/table/getEntityGroupItems';
import type { TableItem, TableColumnHeading } from '@/lib/schema';

describe('getTableItemSortComparator', () => {
  it('sorts by numeric key descending', () => {
    const cmp = getTableItemSortComparator(['size']);
    const a = { size: 100 } as TableItem;
    const b = { size: 200 } as TableItem;
    expect(cmp(a, b)).toBeGreaterThan(0);
    expect(cmp(b, a)).toBeLessThan(0);
  });

  it('sorts by string key ascending', () => {
    const cmp = getTableItemSortComparator(['name']);
    const a = { name: 'b' } as TableItem;
    const b = { name: 'a' } as TableItem;
    expect(cmp(a, b)).toBeGreaterThan(0);
    expect(cmp(b, a)).toBeLessThan(0);
  });

  it('returns 0 when values equal', () => {
    const cmp = getTableItemSortComparator(['x']);
    const a = { x: 1 } as TableItem;
    const b = { x: 1 } as TableItem;
    expect(cmp(a, b)).toBe(0);
  });
});

describe('shouldGroupEntity', () => {
  it('returns false when items empty', () => {
    expect(shouldGroupEntity([], false)).toBe(false);
  });

  it('returns false when isEntityGrouped is true', () => {
    expect(shouldGroupEntity([{ entity: 'foo' } as TableItem], true)).toBe(false);
  });

  it('returns false when no items have entity', () => {
    expect(shouldGroupEntity([{ name: 'x' } as TableItem], false)).toBe(false);
  });

  it('returns true when items have entity and not grouped', () => {
    expect(shouldGroupEntity([{ entity: 'foo' } as TableItem], false)).toBe(true);
  });
});

describe('getEntityGroupItems', () => {
  const headings: TableColumnHeading[] = [
    { key: 'entity', valueType: 'text', label: 'Entity' },
    { key: 'size', valueType: 'bytes', label: 'Size' },
  ];

  it('returns empty when shouldGroupEntity is true (no items)', () => {
    const result = getEntityGroupItems({
      items: [],
      headings,
      isEntityGrouped: false,
      skipSumming: [],
      sortedBy: [],
    });
    expect(result).toEqual([]);
  });

  it('returns grouped items when isEntityGrouped is true and items have entity', () => {
    const result = getEntityGroupItems({
      items: [{ entity: 'foo', size: 100 } as TableItem],
      headings,
      isEntityGrouped: true,
      skipSumming: [],
      sortedBy: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].entity).toBe('foo');
  });

  it('returns empty when isEntityGrouped is false (shouldGroupEntity true)', () => {
    const result = getEntityGroupItems({
      items: [{ entity: 'foo', size: 100 } as TableItem],
      headings,
      isEntityGrouped: false,
      skipSumming: [],
      sortedBy: [],
    });
    expect(result).toEqual([]);
  });

  it('groups items by entity and sums summable columns', () => {
    const items: TableItem[] = [
      { entity: 'A', size: 100 } as TableItem,
      { entity: 'A', size: 50 } as TableItem,
      { entity: 'B', size: 200 } as TableItem,
    ];
    const result = getEntityGroupItems({
      items,
      headings,
      isEntityGrouped: true,
      skipSumming: [],
      sortedBy: [],
    });
    expect(result).toHaveLength(2);
    const entityA = result.find((r) => r.entity === 'A');
    const entityB = result.find((r) => r.entity === 'B');
    expect(entityA?.size).toBe(150);
    expect(entityB?.size).toBe(200);
  });

  it('sorts result when sortedBy provided', () => {
    const items: TableItem[] = [
      { entity: 'A', size: 100 } as TableItem,
      { entity: 'B', size: 200 } as TableItem,
    ];
    const result = getEntityGroupItems({
      items,
      headings,
      isEntityGrouped: true,
      skipSumming: [],
      sortedBy: ['size'],
    });
    expect(result[0].entity).toBe('B');
    expect(result[1].entity).toBe('A');
  });

  it('returns empty when headings[0] has no key', () => {
    const result = getEntityGroupItems({
      items: [{ entity: 'foo' } as TableItem],
      headings: [{ valueType: 'text', label: 'X' }] as TableColumnHeading[],
      isEntityGrouped: true,
      skipSumming: [],
      sortedBy: [],
    });
    expect(result).toEqual([]);
  });
});
