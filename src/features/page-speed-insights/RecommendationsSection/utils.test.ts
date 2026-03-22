import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatTime,
  getRecommendationPriority,
} from '@/features/page-speed-insights/RecommendationsSection/utils';

describe('utils', () => {
  describe('formatBytes', () => {
    it('returns empty string for undefined or zero', () => {
      expect(formatBytes(undefined)).toBe('');
      expect(formatBytes(0)).toBe('');
    });

    it('formats bytes under 1024 as B', () => {
      expect(formatBytes(100)).toBe('100 B');
      expect(formatBytes(1023)).toBe('1023 B');
    });

    it('formats bytes under 1024*1024 as KiB', () => {
      expect(formatBytes(1024)).toBe('1.0 KiB');
      expect(formatBytes(2048)).toBe('2.0 KiB');
    });

    it('formats bytes 1024*1024 and above as MiB', () => {
      expect(formatBytes(1024 * 1024)).toBe('1.0 MiB');
      expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MiB');
    });
  });

  describe('formatTime', () => {
    it('returns empty string for undefined or zero', () => {
      expect(formatTime(undefined)).toBe('');
      expect(formatTime(0)).toBe('');
    });

    it('formats ms under 1000 as ms', () => {
      expect(formatTime(500)).toBe('500 ms');
      expect(formatTime(999)).toBe('999 ms');
    });

    it('formats 1000+ ms as seconds', () => {
      expect(formatTime(1000)).toBe('1.0 s');
      expect(formatTime(2500)).toBe('2.5 s');
    });
  });

  describe('getRecommendationPriority', () => {
    it('returns high for null, undefined, or 0 score', () => {
      expect(getRecommendationPriority(null)).toBe('high');
      expect(getRecommendationPriority(undefined)).toBe('high');
      expect(getRecommendationPriority(0)).toBe('high');
    });

    it('returns high for score < 0.5', () => {
      expect(getRecommendationPriority(0.3)).toBe('high');
      expect(getRecommendationPriority(0.49)).toBe('high');
    });

    it('returns medium for 0.5 <= score < 0.75', () => {
      expect(getRecommendationPriority(0.5)).toBe('medium');
      expect(getRecommendationPriority(0.74)).toBe('medium');
    });

    it('returns low for score >= 0.75 when savings are small', () => {
      expect(getRecommendationPriority(0.75)).toBe('low');
      expect(getRecommendationPriority(0.9)).toBe('low');
    });

    it('returns high when savings > 1000', () => {
      expect(getRecommendationPriority(0.8, 1500)).toBe('high');
    });

    it('returns medium when savings > 500 and <= 1000', () => {
      expect(getRecommendationPriority(0.8, 600)).toBe('medium');
    });
  });
});
