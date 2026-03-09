import { describe, expect, it } from 'vitest';
import { categorySortFn } from '@/components/page-speed/tsTable/categorySortFn';

function createRow(categoryId?: string) {
  return {
    original: {
      _category: categoryId ? { id: categoryId } : undefined,
    },
  } as any;
}

describe('categorySortFn', () => {
  it('sorts known categories using the configured category order', () => {
    expect(
      categorySortFn(createRow('performance'), createRow('accessibility')),
    ).toBeLessThan(0);

    expect(categorySortFn(createRow('seo'), createRow('performance'))).toBe(
      1,
    );
  });

  it('keeps original order when categories are equal or both unknown', () => {
    expect(categorySortFn(createRow('seo'), createRow('seo'))).toBe(0);
    expect(categorySortFn(createRow(), createRow('unknown'))).toBe(0);
  });
});
