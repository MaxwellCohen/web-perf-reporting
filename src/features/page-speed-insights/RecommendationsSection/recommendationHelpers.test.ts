import { describe, expect, it } from 'vitest';
import {
  getRecommendationAuditId,
  isNetworkDependencyTreeRecommendation,
} from '@/features/page-speed-insights/RecommendationsSection/recommendationHelpers';

describe('recommendationHelpers', () => {
  describe('getRecommendationAuditId', () => {
    it('strips last segment after final hyphen', () => {
      expect(getRecommendationAuditId('unused-css-rules-metric')).toBe(
        'unused-css-rules',
      );
    });

    it('returns empty string when no hyphen (slice(0,-1) removes last segment)', () => {
      expect(getRecommendationAuditId('auditid')).toBe('');
    });

    it('handles multiple segments', () => {
      expect(getRecommendationAuditId('a-b-c-d')).toBe('a-b-c');
    });
  });

  describe('isNetworkDependencyTreeRecommendation', () => {
    it('returns true for id starting with network-dependency-tree-insight', () => {
      expect(
        isNetworkDependencyTreeRecommendation('network-dependency-tree-insight'),
      ).toBe(true);
      expect(
        isNetworkDependencyTreeRecommendation(
          'network-dependency-tree-insight-something',
        ),
      ).toBe(true);
    });

    it('returns false for other ids', () => {
      expect(isNetworkDependencyTreeRecommendation('unused-css-rules')).toBe(
        false,
      );
      expect(
        isNetworkDependencyTreeRecommendation('other-network-dependency'),
      ).toBe(false);
    });
  });
});
