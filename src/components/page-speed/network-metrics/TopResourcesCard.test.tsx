import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopResourcesCard } from '@/components/page-speed/network-metrics/TopResourcesCard';

vi.mock('@/components/page-speed/lh-categories/table/RenderTableValue', () => ({
  RenderBytesValue: ({ value }: { value: unknown }) => (
    <span data-testid="bytes">{String(value)}</span>
  ),
  RenderMSValue: ({ value }: { value: unknown }) => (
    <span data-testid="ms">{String(value)}</span>
  ),
}));

vi.mock('@/components/page-speed/lh-categories/table/DataTableHeader', () => ({
  DataTableHeader: () => (
    <thead data-testid="data-table-header">
      <tr><th>URL</th><th>Type</th></tr>
    </thead>
  ),
}));

vi.mock('@/components/page-speed/lh-categories/table/DataTableBody', () => ({
  DataTableBody: () => (
    <tbody data-testid="data-table-body">
      <tr><td>example.com/script.js</td><td>Script</td></tr>
    </tbody>
  ),
}));

vi.mock('@/components/page-speed/JSUsage/TableControls', () => ({
  PaginationCard: () => <div data-testid="pagination" />,
}));

describe('TopResourcesCard', () => {
  it('returns null when stats is empty', () => {
    const { container } = render(<TopResourcesCard stats={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when all stats have empty topResources', () => {
    const { container } = render(
      <TopResourcesCard
        stats={[
          { label: 'A', topResources: [] },
          { label: 'B', topResources: [] },
        ]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders card with resources', () => {
    const { container } = render(
      <TopResourcesCard
        stats={[
          {
            label: 'Desktop',
            topResources: [
              {
                url: 'https://example.com/script.js',
                resourceType: 'Script',
                transferSize: 1024,
                resourceSize: 2048,
                networkRequestTime: 50,
              } as any,
            ],
          },
        ]}
      />
    );
    expect(container.textContent).toContain('Resources by Transfer Size');
    expect(container.querySelector('[data-testid="data-table-header"]')).toBeTruthy();
  });
});
