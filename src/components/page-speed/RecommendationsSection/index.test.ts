import { describe, expect, it } from 'vitest';
import * as mod from '@/components/page-speed/RecommendationsSection';

describe('RecommendationsSection/index', () => {
  it('exports RecommendationsSection', () => {
    expect(mod).toHaveProperty('RecommendationsSection');
    expect(typeof mod.RecommendationsSection).toBe('function');
  });
});
