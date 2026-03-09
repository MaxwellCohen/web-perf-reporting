import { describe, expect, it } from 'vitest';
import { extractSpecificRecommendations } from '@/components/page-speed/RecommendationsSection/extractRecommendations';

describe('extractSpecificRecommendations', () => {
  it('returns steps for wastedBytes', () => {
    const result = extractSpecificRecommendations(
      'unused-javascript',
      [{ url: 'https://example.com/app.js', wastedBytes: 5000 }],
      {},
    );
    expect(result.some((r) => r.step.includes('Remove') && r.step.includes('4.9 KiB'))).toBe(true);
  });

  it('returns steps for wastedMs', () => {
    const result = extractSpecificRecommendations(
      'bootup-time',
      [{ url: 'https://example.com/vendor.js', wastedMs: 200 }],
      {},
    );
    expect(result.some((r) => r.step.includes('Optimize') && r.step.includes('200 ms'))).toBe(true);
  });

  it('skips items without url or with Unattributable', () => {
    const result = extractSpecificRecommendations(
      'audit',
      [
        { url: undefined, wastedBytes: 100 },
        { url: 'Unattributable', wastedBytes: 100 },
      ],
      {},
    );
    expect(result).toHaveLength(0);
  });

  it('adds explanation-based steps for third-party', () => {
    const result = extractSpecificRecommendations(
      'audit',
      [],
      { explanation: 'This page includes third-party scripts that block rendering.' },
    );
    expect(result.some((r) => r.step.includes('lazy loading') || r.step.includes('third-party'))).toBe(true);
  });

  it('adds explanation-based steps for render-blocking', () => {
    const result = extractSpecificRecommendations(
      'audit',
      [],
      { explanation: 'render-blocking resources delay first paint.' },
    );
    expect(result.some((r) => r.step.includes('Defer') || r.step.includes('render-blocking'))).toBe(true);
  });

  it('adds displayValue step when displayValue contains KiB', () => {
    const result = extractSpecificRecommendations(
      'audit',
      [],
      { displayValue: 'Potential savings of 120 KiB' },
    );
    expect(result.some((r) => r.step.includes('Potential savings'))).toBe(true);
  });

  it('includes reportLabels when reportLabel is provided', () => {
    const result = extractSpecificRecommendations(
      'audit',
      [{ url: 'https://example.com/x.js', totalBytes: 10000 }],
      {},
      'Mobile',
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].reports).toEqual(['Mobile']);
  });
});
