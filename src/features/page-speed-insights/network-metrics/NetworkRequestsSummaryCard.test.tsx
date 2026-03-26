import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkRequestsSummaryCard } from '@/features/page-speed-insights/network-metrics/NetworkRequestsSummaryCard';
import type { NetworkRequestStatsRow } from '@/features/page-speed-insights/network-metrics/useNetworkMetricsData';

const mockUseNetworkRequestStats = vi.hoisted(() => vi.fn());

vi.mock('@/features/page-speed-insights/network-metrics/useNetworkMetricsStore', () => ({
  useNetworkRequestStats: () => mockUseNetworkRequestStats(),
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/RenderTableValue', () => ({
  RenderBytesValue: ({ value, className }: { value: unknown; className?: string }) => {
    const bytes = Math.floor(Number(value));
    const kb = bytes / 1024;
    const mb = kb / 1024;
    const display =
      mb > 1 ? `${mb.toFixed(2)} MB` : kb > 1 ? `${kb.toFixed(2)} KB` : `${bytes} bytes`;
    return (
      <span title="bytes" className={className ?? ''}>
        {display}
      </span>
    );
  },
}));

function row(
  partial: Pick<
    NetworkRequestStatsRow,
    'label' | 'totalRequests' | 'totalTransferSize' | 'totalResourceSize'
  >,
): NetworkRequestStatsRow {
  return {
    byResourceType: {},
    topResources: [],
    ...partial,
  };
}

describe('NetworkRequestsSummaryCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseNetworkRequestStats.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null when stats is empty', () => {
    mockUseNetworkRequestStats.mockReturnValue([]);
    const { container } = render(<NetworkRequestsSummaryCard />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when all stats have zero totalRequests', () => {
    mockUseNetworkRequestStats.mockReturnValue([
      row({ label: 'A', totalRequests: 0, totalTransferSize: 0, totalResourceSize: 0 }),
      row({ label: 'B', totalRequests: 0, totalTransferSize: 0, totalResourceSize: 0 }),
    ]);
    const { container } = render(<NetworkRequestsSummaryCard />);
    expect(container.firstChild).toBeNull();
  });

  it('renders card with title and table when stats have requests', () => {
    mockUseNetworkRequestStats.mockReturnValue([
      row({
        label: 'Desktop',
        totalRequests: 10,
        totalTransferSize: 1024,
        totalResourceSize: 2048,
      }),
    ]);
    const { container } = render(<NetworkRequestsSummaryCard />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('does not show Report column when single valid stat', () => {
    mockUseNetworkRequestStats.mockReturnValue([
      row({
        label: 'Only',
        totalRequests: 5,
        totalTransferSize: 100,
        totalResourceSize: 200,
      }),
    ]);
    const { container } = render(<NetworkRequestsSummaryCard />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows Report column when multiple valid stats', () => {
    mockUseNetworkRequestStats.mockReturnValue([
      row({ label: 'Desktop', totalRequests: 1, totalTransferSize: 0, totalResourceSize: 0 }),
      row({ label: 'Mobile', totalRequests: 1, totalTransferSize: 0, totalResourceSize: 0 }),
    ]);
    const { container } = render(<NetworkRequestsSummaryCard />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('filters out stats with zero totalRequests', () => {
    mockUseNetworkRequestStats.mockReturnValue([
      row({ label: 'Zero', totalRequests: 0, totalTransferSize: 0, totalResourceSize: 0 }),
      row({
        label: 'Valid',
        totalRequests: 3,
        totalTransferSize: 500,
        totalResourceSize: 600,
      }),
    ]);
    const { container } = render(<NetworkRequestsSummaryCard />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows Unknown for empty label when report column shown', () => {
    mockUseNetworkRequestStats.mockReturnValue([
      row({ label: '', totalRequests: 1, totalTransferSize: 0, totalResourceSize: 0 }),
      row({ label: 'B', totalRequests: 1, totalTransferSize: 0, totalResourceSize: 0 }),
    ]);
    const { container } = render(<NetworkRequestsSummaryCard />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
