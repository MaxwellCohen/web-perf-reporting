import { describe, expect, it } from 'vitest';
import * as mod from '@/features/page-speed-insights/RecommendationsSection';

describe('RecommendationsSection/index', () => {
  it('exports RecommendationsSection', () => {
    expect(mod).toHaveProperty('RecommendationsSection');
    expect(typeof mod.RecommendationsSection).toBe('function');
  });
});
