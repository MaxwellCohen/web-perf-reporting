import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryAuditSection } from '@/components/page-speed/lh-categories/CategoryAuditSection';

vi.mock('@/components/ui/accordion', () => ({
  Details: ({ children }: { children: React.ReactNode }) => <details>{children}</details>,
}));

vi.mock('@/components/page-speed/lh-categories/CategoryScoreInfo', () => ({
  CategoryScoreInfo: ({ category, device }: { category: unknown; device: string }) => (
    <span data-testid="score-info" data-device={device}>
      {String((category as { title?: string })?.title ?? '')}
    </span>
  ),
}));

vi.mock('@/components/page-speed/lh-categories/AuditDetailsSection', () => ({
  AuditDetailsSection: ({ auditRef }: { auditRef: { id?: string } }) => (
    <div data-testid="audit-details">{auditRef?.id}</div>
  ),
}));

vi.mock('@/components/page-speed/ScoreDisplay', () => ({
  sortByScoreDisplayModes: () => 0,
}));

describe('CategoryAuditSection', () => {
  it('returns null when category is empty', () => {
    const { container } = render(
      <CategoryAuditSection category={[]} auditsRecords={[{}]} labels={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when category has no data', () => {
    const { container } = render(
      <CategoryAuditSection category={[null, null]} auditsRecords={[{}]} labels={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders category title and score info', () => {
    const category = [
      {
        title: 'Performance',
        auditRefs: [
          { id: 'first-contentful-paint', group: undefined },
        ],
      },
    ];
    const auditsRecords = [
      {
        'first-contentful-paint': {
          id: 'first-contentful-paint',
          details: { type: 'table' },
        },
      },
    ];
    const { container } = render(
      <CategoryAuditSection
        category={category as any}
        auditsRecords={auditsRecords as any}
        labels={['Mobile']}
      />,
    );
    expect(container.textContent).toContain('Performance');
    expect(container.querySelector('[data-testid="score-info"]')).toBeTruthy();
  });

  it('filters out auditRefs in AuditRefsToHide', () => {
    const category = [
      {
        title: 'Perf',
        auditRefs: [
          { id: 'final-screenshot', group: undefined },
          { id: 'valid-audit', group: undefined },
        ],
      },
    ];
    const auditsRecords = [
      {
        'final-screenshot': { id: 'final-screenshot', details: {} },
        'valid-audit': { id: 'valid-audit', details: { type: 'table' } },
      },
    ];
    const { container } = render(
      <CategoryAuditSection
        category={category as any}
        auditsRecords={auditsRecords as any}
        labels={['Mobile']}
      />,
    );
    expect(container.querySelector('[data-testid="audit-details"]')).toBeTruthy();
    expect(container.textContent).toContain('valid-audit');
  });
});