import { describe, expect, it } from 'vitest';
import {
  AUDITS_WITH_SEPARATE_TABLES_PER_REPORT,
  shouldShowSeparateTablesPerReport,
} from '@/components/page-speed/auditTableConfig';

describe('auditTableConfig', () => {
  it('exports an array of audit IDs', () => {
    expect(AUDITS_WITH_SEPARATE_TABLES_PER_REPORT).toBeInstanceOf(Array);
    expect(AUDITS_WITH_SEPARATE_TABLES_PER_REPORT.length).toBeGreaterThan(0);
    expect(AUDITS_WITH_SEPARATE_TABLES_PER_REPORT).toContain('dom-size-insight');
    expect(AUDITS_WITH_SEPARATE_TABLES_PER_REPORT).toContain('network-requests');
  });

  it('returns true for audit IDs in the list', () => {
    expect(shouldShowSeparateTablesPerReport('dom-size-insight')).toBe(true);
    expect(shouldShowSeparateTablesPerReport('network-requests')).toBe(true);
    expect(shouldShowSeparateTablesPerReport('resource-summary')).toBe(true);
  });

  it('returns false for audit IDs not in the list', () => {
    expect(shouldShowSeparateTablesPerReport('unknown-audit')).toBe(false);
    expect(shouldShowSeparateTablesPerReport('first-contentful-paint')).toBe(
      false,
    );
  });
});
