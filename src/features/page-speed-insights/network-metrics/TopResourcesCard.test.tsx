import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetworkRequestStatsRow } from '@/features/page-speed-insights/network-metrics/useNetworkMetricsData';

const mockUseNetworkRequestStats = vi.hoisted(() => vi.fn());

vi.mock('@/features/page-speed-insights/network-metrics/useNetworkMetricsStore', () => ({
  useNetworkRequestStats: () => mockUseNetworkRequestStats(),
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/RenderTableValue', () => ({
  RenderBytesValue: ({ value }: { value: unknown }) => (
    <span data-testid="bytes">{String(value)}</span>
  ),
  RenderMSValue: ({ value }: { value: unknown }) => (
    <span data-testid="ms">{String(value)}</span>
  ),
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/DataTableHeader', () => ({
  DataTableHeader: () => (
    <thead data-testid="data-table-header">
      <tr><th>URL</th><th>Type</th></tr>
    </thead>
  ),
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/DataTableBody', () => ({
  DataTableBody: () => (
    <tbody data-testid="data-table-body">
      <tr><td>example.com/script.js</td><td>Script</td></tr>
    </tbody>
  ),
}));

vi.mock('@/features/page-speed-insights/JSUsage/TableControls', () => ({
  PaginationCard: () => <div data-testid="pagination" />,
}));

import { TopResourcesCard } from '@/features/page-speed-insights/network-metrics/TopResourcesCard';

function statsRow(
  partial: Pick<NetworkRequestStatsRow, 'label' | 'topResources'> &
    Partial<
      Pick<
        NetworkRequestStatsRow,
        'totalRequests' | 'totalTransferSize' | 'totalResourceSize' | 'byResourceType'
      >
    >,
): NetworkRequestStatsRow {
  return {
    totalRequests: 0,
    totalTransferSize: 0,
    totalResourceSize: 0,
    byResourceType: {},
    ...partial,
  };
}

describe('TopResourcesCard', () => {
  beforeEach(() => {
    mockUseNetworkRequestStats.mockReset();
  });

  it('returns null when stats is empty', () => {
    mockUseNetworkRequestStats.mockReturnValue([]);
    const { container } = render(<TopResourcesCard />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when all stats have empty topResources', () => {
    mockUseNetworkRequestStats.mockReturnValue([
      statsRow({ label: 'A', topResources: [] }),
      statsRow({ label: 'B', topResources: [] }),
    ]);
    const { container } = render(<TopResourcesCard />);
    expect(container.firstChild).toBeNull();
  });

  it('renders card with resources', () => {
    mockUseNetworkRequestStats.mockReturnValue([
      statsRow({
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
      }),
    ]);
    const { container } = render(<TopResourcesCard />);
    expect(container.textContent).toContain('Resources by Transfer Size');
    expect(container.querySelector('[data-testid="data-table-header"]')).toBeTruthy();
  });
});
