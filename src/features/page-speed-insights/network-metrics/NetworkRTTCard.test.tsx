import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NetworkRTTCard } from '@/features/page-speed-insights/network-metrics/NetworkRTTCard';

describe('NetworkRTTCard', () => {
  it('returns null when metrics is empty', () => {
    const { container } = render(<NetworkRTTCard metrics={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when all metrics have empty networkRTT', () => {
    const { container } = render(
      <NetworkRTTCard
        metrics={[
          { label: 'Desktop', networkRTT: [] },
          { label: 'Mobile', networkRTT: [] },
        ]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders card with title and table when metrics have RTT data', () => {
    const { container } = render(
      <NetworkRTTCard
        metrics={[
          {
            label: 'Desktop',
            networkRTT: [
              { origin: 'https://example.com', rtt: 50 },
              { origin: 'https://cdn.example.com', rtt: 20 },
            ] as any,
          },
        ]}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
