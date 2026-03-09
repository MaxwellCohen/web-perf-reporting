import { describe, expect, it } from 'vitest';
import {
  ALL_DEVICES_LABEL,
  compareReportLabels,
  formatReportLabelList,
  formatReportTableTitle,
  getCombinedReportLabel,
  normalizeReportLabel,
  sortReportLabels,
} from '@/components/page-speed/shared/reportLabels';

describe('normalizeReportLabel', () => {
  it('normalizes All Devices variants', () => {
    expect(normalizeReportLabel('All Devices')).toBe(ALL_DEVICES_LABEL);
    expect(normalizeReportLabel('All Devices (mobile)')).toBe(ALL_DEVICES_LABEL);
  });

  it('normalizes Mobile variants', () => {
    expect(normalizeReportLabel('Mobile')).toBe('Mobile');
    expect(normalizeReportLabel('Mobile (some label)')).toBe('Mobile');
  });

  it('normalizes Desktop variants', () => {
    expect(normalizeReportLabel('Desktop')).toBe('Desktop');
    expect(normalizeReportLabel('Desktop (label)')).toBe('Desktop');
  });

  it('returns trimmed label for other groups', () => {
    expect(normalizeReportLabel('  Custom Label  ')).toBe('Custom Label');
  });
});

describe('compareReportLabels', () => {
  it('orders all-devices before mobile', () => {
    expect(compareReportLabels('All Devices', 'Mobile')).toBeLessThan(0);
  });

  it('orders mobile before desktop', () => {
    expect(compareReportLabels('Mobile', 'Desktop')).toBeLessThan(0);
  });

  it('orders desktop before other', () => {
    expect(compareReportLabels('Desktop', 'Other')).toBeLessThan(0);
  });

  it('uses localeCompare for same group', () => {
    expect(compareReportLabels('Custom A', 'Custom B')).toBeLessThan(0);
  });
});

describe('sortReportLabels', () => {
  it('sorts and deduplicates labels', () => {
    const result = sortReportLabels(['Desktop', 'Mobile', 'Mobile', 'Desktop']);
    expect(result).toEqual(['Mobile', 'Desktop']);
  });

  it('filters empty labels', () => {
    const result = sortReportLabels(['', 'Mobile', '  ']);
    expect(result).toContain('Mobile');
  });
});

describe('formatReportLabelList', () => {
  it('returns All Devices for empty array', () => {
    expect(formatReportLabelList([])).toBe(ALL_DEVICES_LABEL);
  });

  it('joins multiple labels', () => {
    expect(formatReportLabelList(['Mobile', 'Desktop'])).toBe('Mobile, Desktop');
  });
});

describe('getCombinedReportLabel', () => {
  it('returns normalized label for single report', () => {
    expect(getCombinedReportLabel(['Mobile'])).toBe('Mobile');
  });

  it('returns All Devices for multiple reports', () => {
    expect(getCombinedReportLabel(['Mobile', 'Desktop'])).toBe(ALL_DEVICES_LABEL);
  });
});

describe('formatReportTableTitle', () => {
  it('formats title with singular item', () => {
    expect(formatReportTableTitle('audit name', 'Mobile', 1)).toBe(
      'Audit Name Table for Mobile (1 item)'
    );
  });

  it('formats title with plural items', () => {
    expect(formatReportTableTitle('audit name', 'Desktop', 5)).toBe(
      'Audit Name Table for Desktop (5 items)'
    );
  });
});
