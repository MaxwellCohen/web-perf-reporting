import { describe, expect, it } from 'vitest';
import {
  canGroup,
  canSort,
  isNumberColumn,
} from '@/features/page-speed-insights/lh-categories/table/detailTableShared';

describe('detailTableShared', () => {
  it('recognizes groupable value types', () => {
    expect(canGroup('text')).toBe(true);
    expect(canGroup('url')).toBe(true);
    expect(canGroup('numeric')).toBe(false);
  });

  it('recognizes sortable value types', () => {
    expect(canSort('text')).toBe(true);
    expect(canSort('node')).toBe(false);
  });

  it('recognizes numeric columns', () => {
    expect(isNumberColumn('bytes')).toBe(true);
    expect(isNumberColumn('timespanMs')).toBe(true);
    expect(isNumberColumn('link')).toBe(false);
  });
});
