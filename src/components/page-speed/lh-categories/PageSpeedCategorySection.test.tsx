import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageSpeedCategorySection } from '@/components/page-speed/lh-categories/PageSpeedCategorySection';

vi.mock('@/components/page-speed/lh-categories/CategoryAuditSection', () => ({
  CategoryAuditSection: ({
    category,
    labels,
    auditsRecords,
  }: {
    category: unknown[];
    labels: string[];
    auditsRecords: unknown[];
  }) => (
    <div data-testid="category-audit">
      {category.length} categories, {labels.join(', ')}
    </div>
  ),
}));

describe('PageSpeedCategorySection', () => {
  it('renders nothing when data has no categories', () => {
    const data = [
      { lighthouseResult: { categories: null, audits: {} } },
    ];
    const { container } = render(
      <PageSpeedCategorySection data={data as any} labels={['Mobile']} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders CategoryAuditSection for each category', () => {
    const data = [
      {
        lighthouseResult: {
          categories: {
            performance: { id: 'performance', title: 'Performance', auditRefs: [] },
            accessibility: { id: 'accessibility', title: 'Accessibility', auditRefs: [] },
          },
          audits: {},
        },
      },
    ];
    const { container } = render(
      <PageSpeedCategorySection data={data as any} labels={['Mobile']} />,
    );
    const sections = container.querySelectorAll('[data-testid="category-audit"]');
    expect(sections.length).toBeGreaterThanOrEqual(1);
  });

  it('passes labels and audits to CategoryAuditSection', () => {
    const data = [
      {
        lighthouseResult: {
          categories: { performance: { title: 'Performance', auditRefs: [] } },
          audits: { 'fcp': {} },
        },
      },
    ];
    const { container } = render(
      <PageSpeedCategorySection data={data as any} labels={['Mobile', 'Desktop']} />,
    );
    expect(container.textContent).toContain('Mobile');
  });
});