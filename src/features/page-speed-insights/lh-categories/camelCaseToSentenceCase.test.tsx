import { describe, expect, it } from 'vitest';
import { camelCaseToSentenceCase } from '@/features/page-speed-insights/lh-categories/camelCaseToSentenceCase';

describe('camelCaseToSentenceCase', () => {
  it('converts camelCase text into sentence case', () => {
    expect(camelCaseToSentenceCase('largestContentfulPaint')).toBe(
      'Largest contentful paint',
    );
  });

  it('returns an empty string for non-string values', () => {
    expect(camelCaseToSentenceCase(42 as never)).toBe('');
  });
});
