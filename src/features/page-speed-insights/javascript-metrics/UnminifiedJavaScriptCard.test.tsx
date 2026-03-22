import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/page-speed-insights/shared/TableCard', () => ({
  TableCard: ({ title }: { title: string }) => <div data-testid="table-card">{title}</div>,
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/RenderTableValue', () => ({
  RenderBytesValue: ({ value }: { value: number }) => <span>{value} B</span>,
}));

vi.mock('@/features/page-speed-insights/shared/tableConfigHelpers', () => ({
  useStandardTable: () => ({
    getHeaderGroups: () => [],
    getRowModel: () => ({ rows: [] }),
    getRowCount: () => 0,
  }),
}));

vi.mock('@/features/page-speed-insights/shared/useTableColumns', () => ({
  useTableColumns: () => [],
}));

vi.mock('@/features/page-speed-insights/shared/tableColumnHelpers', () => ({
  createURLColumn: () => ({ id: 'url', header: 'URL' }),
  createBytesColumn: () => ({ id: 'bytes', header: 'Bytes' }),
}));

import { UnminifiedJavaScriptCard } from '@/features/page-speed-insights/javascript-metrics/UnminifiedJavaScriptCard';

describe('UnminifiedJavaScriptCard', () => {
  it('returns null when no metrics have unminifiedJS items', () => {
    const { container } = render(
      <UnminifiedJavaScriptCard
        metrics={[
          { label: 'Mobile', unminifiedJS: [] },
          { label: 'Desktop', unminifiedJS: [] },
        ]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders card with table when data present', () => {
    const { container } = render(
      <UnminifiedJavaScriptCard
        metrics={[
          {
            label: 'Mobile',
            unminifiedJS: [
              {
                url: 'https://example.com/app.js',
                wastedBytes: 5000,
                totalBytes: 10000,
              },
            ] as any,
          },
        ]}
      />
    );
    expect(container.querySelector('[data-testid="table-card"]')).toBeTruthy();
    expect(container.textContent).toContain('Unminified JavaScript');
  });
});
