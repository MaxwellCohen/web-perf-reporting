import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
  it('returns null when metrics have no timing data', () => {
    const { container } = render(
      <TimingMetricsCard
        metrics={[
          { label: 'Mobile' },
          { label: 'Desktop' },
        ]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when metrics have ttfb', () => {
    const { container } = render(
      <TimingMetricsCard
        metrics={[
          { label: 'Mobile', ttfb: 100, ttfbCategory: 'FAST' },
        ]}
      />
    );
    expect(container.textContent).toContain('Page Load Timing Metrics');
    expect(container.textContent).toContain('TTFB');
  });

  it('renders category badges', () => {
    const { container } = render(
      <TimingMetricsCard
        metrics={[
          { label: 'Mobile', ttfb: 100, ttfbCategory: 'FAST' },
        ]}
      />
    );
    expect(container.textContent).toContain('FAST');
  });
});
