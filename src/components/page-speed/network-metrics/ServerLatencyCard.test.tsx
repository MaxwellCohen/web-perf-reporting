import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServerLatencyCard } from '@/components/page-speed/network-metrics/ServerLatencyCard';

describe('ServerLatencyCard', () => {
  it('returns null when metrics have no serverLatency', () => {
    const { container } = render(
      <ServerLatencyCard
        metrics={[
          { label: 'Mobile', serverLatency: [] },
          { label: 'Desktop', serverLatency: [] },
        ]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders TableCard when metrics have serverLatency', () => {
    const { container } = render(
      <ServerLatencyCard
        metrics={[
          {
            label: 'Mobile',
            serverLatency: [
              {
                origin: 'https://example.com',
                serverResponseTime: 100,
              },
            ],
          },
        ]}
      />
    );
    expect(container.textContent).toContain('Server Backend Latencies');
  });
});
