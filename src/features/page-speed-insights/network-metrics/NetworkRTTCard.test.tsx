import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseNetworkMetricSeries = vi.hoisted(() => vi.fn());

vi.mock('@/features/page-speed-insights/network-metrics/useNetworkMetricsStore', () => ({
  useNetworkMetricSeries: () => mockUseNetworkMetricSeries(),
}));

import { NetworkRTTCard } from '@/features/page-speed-insights/network-metrics/NetworkRTTCard';

describe('NetworkRTTCard', () => {
  beforeEach(() => {
    mockUseNetworkMetricSeries.mockReset();
  });

  it('returns null when metrics is empty', () => {
    mockUseNetworkMetricSeries.mockReturnValue([]);
    const { container } = render(<NetworkRTTCard />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when all metrics have empty networkRTT', () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      { label: 'Desktop', networkRTT: [] },
      { label: 'Mobile', networkRTT: [] },
    ]);
    const { container } = render(<NetworkRTTCard />);
    expect(container.firstChild).toBeNull();
  });

  it('renders card with title and table when metrics have RTT data', () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      {
        label: 'Desktop',
        networkRTT: [
          { origin: 'https://example.com', rtt: 50 },
          { origin: 'https://cdn.example.com', rtt: 20 },
        ] as any,
      },
    ]);
    const { container } = render(<NetworkRTTCard />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
