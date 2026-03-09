import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DetailTableSeparatePerReport } from '@/components/page-speed/lh-categories/table/DetailTableSeparatePerReport';

vi.mock('@/components/page-speed/lh-categories/table/DataTableHeader', () => ({
  DataTableHeader: () => <thead data-testid="data-table-header" />,
}));

vi.mock('@/components/page-speed/lh-categories/table/DataTableBody', () => ({
  DataTableBody: () => <tbody data-testid="data-table-body" />,
}));

const createMockRow = (reportLabel: string, itemCount: number) => ({
  _userLabel: reportLabel,
  auditResult: {
    id: 'test-audit',
    details: {
      type: 'table',
      headings: [{ key: 'name', valueType: 'text', label: 'Name' }],
      items: Array.from({ length: itemCount }, (_, i) => ({ name: `Item ${i}` })),
    },
  },
});

describe('DetailTableSeparatePerReport', () => {
  it('renders accordion with one item per report', () => {
    const rows = [
      createMockRow('Desktop', 2),
      createMockRow('Mobile', 1),
    ];
    const { container } = render(
      <DetailTableSeparatePerReport rows={rows as any} title="DOM Size" />
    );
    expect(container.textContent).toContain('Dom Size');
    expect(container.textContent).toContain('Desktop');
    expect(container.textContent).toContain('Mobile');
  });

  it('renders report titles with item count', () => {
    const rows = [createMockRow('Desktop', 3)];
    const { container } = render(
      <DetailTableSeparatePerReport rows={rows as any} title="Test" />
    );
    expect(container.textContent).toMatch(/Desktop|3/);
  });

  it('renders accordion items for each report', () => {
    const rows = [createMockRow('Mobile', 1)];
    const { container } = render(
      <DetailTableSeparatePerReport rows={rows as any} title="Audit" />
    );
    expect(container.textContent).toContain('Audit');
    expect(container.textContent).toContain('Mobile');
  });
});
