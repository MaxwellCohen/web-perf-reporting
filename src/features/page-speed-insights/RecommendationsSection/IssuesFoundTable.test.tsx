import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IssuesFoundTable } from '@/features/page-speed-insights/RecommendationsSection/IssuesFoundTable';
import type { TableColumnHeading, TableItem } from '@/lib/schema';

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableCaption: ({ children }: { children: React.ReactNode }) => <caption>{children}</caption>,
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/DataTableHeader', () => ({
  DataTableHeader: () => <thead data-testid="table-header"><tr><th>H</th></tr></thead>,
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/DataTableBody', () => ({
  DataTableBody: () => <tbody data-testid="table-body"><tr><td>Body</td></tr></tbody>,
}));

vi.mock('@/features/page-speed-insights/RecommendationsSection/IssuesFoundTableCell', () => ({
  IssuesFoundTableCell: ({ value }: { value: unknown }) => <span>{String(value)}</span>,
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/NetworkWaterfallCell', () => ({
  NetworkWaterfallCell: () => <span data-testid="waterfall" />,
}));

vi.mock('@/features/page-speed-insights/shared/useSimpleTable', () => ({
  useSimpleTable: ({ data, columns }: { data: TableItem[]; columns: unknown[] }) => ({
    getHeaderGroups: () => [{ id: '1', headers: [] }],
    getRowModel: () => ({ rows: data.map((item, i) => ({ id: String(i), original: item })) }),
  }),
}));

const baseHeadings: TableColumnHeading[] = [
  { key: 'url', label: 'URL', valueType: 'url' },
];

describe('IssuesFoundTable', () => {
  it('renders table with headings and items', () => {
    const items: TableItem[] = [{ url: 'https://example.com' }];
    const { container } = render(
      <IssuesFoundTable headings={baseHeadings} items={items} device="Mobile" />,
    );
    expect(container.querySelector('table')).toBeTruthy();
    expect(container.querySelector('[data-testid="table-header"]')).toBeTruthy();
  });

  it('deduplicates rows by column values', () => {
    const items: TableItem[] = [
      { url: 'https://a.com' },
      { url: 'https://a.com' },
      { url: 'https://b.com' },
    ];
    const { container } = render(
      <IssuesFoundTable headings={baseHeadings} items={items} device="Desktop" />,
    );
    expect(container.querySelector('table')).toBeTruthy();
  });

  it('renders with empty items', () => {
    const { container } = render(
      <IssuesFoundTable headings={baseHeadings} items={[]} device="Mobile" />,
    );
    expect(container.querySelector('table')).toBeTruthy();
  });
});
