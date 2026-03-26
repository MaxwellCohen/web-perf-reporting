import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseNetworkMetricSeries = vi.hoisted(() => vi.fn());

vi.mock('@/features/page-speed-insights/network-metrics/useNetworkMetricsStore', () => ({
  useNetworkMetricSeries: () => mockUseNetworkMetricSeries(),
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/RenderTableValue', () => ({
  RenderMSValue: ({ value }: { value?: number }) => <span>{value ?? 'N/A'}ms</span>,
}));

vi.mock('@/features/page-speed-insights/shared/CardWithTable', () => {
  const React = require('react');
  return {
    CardWithTable: ({
      title,
      header,
      children,
    }: {
      title: string;
      header: React.ReactNode;
      children: React.ReactNode;
    }) => (
    <div>
      <h3>{title}</h3>
      <table>
        <thead>{header}</thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  ),
  };
});

vi.mock('@/components/ui/table', () => {
  const React = require('react');
  return {
    TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
    TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
    TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  };
});

import { TimingMetricsCard } from '@/features/page-speed-insights/network-metrics/TimingMetricsCard';

describe('TimingMetricsCard', () => {
  beforeEach(() => {
    mockUseNetworkMetricSeries.mockReset();
  });

  it('returns null when metrics have no timing data', () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      { label: 'Mobile' },
      { label: 'Desktop' },
    ]);
    const { container } = render(<TimingMetricsCard />);
    expect(container.firstChild).toBeNull();
  });

  it('renders when metrics have ttfb', () => {
    mockUseNetworkMetricSeries.mockReturnValue([
      { label: 'Mobile', ttfb: 100, fcp: 0, lcp: 0, speedIndex: 0, totalBlockingTime: 0 },
    ]);
    const { container } = render(<TimingMetricsCard />);
    expect(container.textContent).toContain('Page Load Timing Metrics');
    expect(container.textContent).toContain('TTFB');
  });
});
