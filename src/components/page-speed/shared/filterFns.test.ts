import { describe, expect, it } from 'vitest';
import {
  booleanFilterFn,
  includesStringFilter,
  inNumberRangeFilter,
  standardFilterFns,
} from '@/components/page-speed/shared/filterFns';

function createRow(value: unknown) {
  return {
    getValue: () => value,
  } as any;
}

const noopAddMeta = () => {};

describe('filterFns', () => {
  it('passes all rows when the boolean filter is empty', () => {
    expect(booleanFilterFn(createRow(true), 'enabled', [], noopAddMeta)).toBe(true);
    expect(booleanFilterFn(createRow(false), 'enabled', undefined, noopAddMeta)).toBe(true);
  });

  it('filters boolean-like values using truthiness', () => {
    expect(booleanFilterFn(createRow(true), 'enabled', [true], noopAddMeta)).toBe(true);
    expect(booleanFilterFn(createRow(1), 'enabled', [true], noopAddMeta)).toBe(true);
    expect(booleanFilterFn(createRow(false), 'enabled', [true], noopAddMeta)).toBe(false);
    expect(booleanFilterFn(createRow(0), 'enabled', [false], noopAddMeta)).toBe(true);
  });

  it('performs case-insensitive string inclusion checks', () => {
    expect(
      includesStringFilter(createRow('Largest Contentful Paint'), 'metric', 'paint', noopAddMeta),
    ).toBe(true);
    expect(includesStringFilter(createRow(null), 'metric', 'paint', noopAddMeta)).toBe(false);
  });

  it('filters numeric ranges inclusively and falls back to zero', () => {
    expect(inNumberRangeFilter(createRow(12), 'score', [10, 20], noopAddMeta)).toBe(true);
    expect(inNumberRangeFilter(createRow(9), 'score', [10, 20], noopAddMeta)).toBe(false);
    expect(inNumberRangeFilter(createRow(undefined), 'score', [0, 0], noopAddMeta)).toBe(true);
  });

  it('exports the standard filter functions map', () => {
    expect(standardFilterFns.booleanFilterFn).toBe(booleanFilterFn);
    expect(standardFilterFns.includesString).toBe(includesStringFilter);
    expect(standardFilterFns.inNumberRange).toBe(inNumberRangeFilter);
  });
});
