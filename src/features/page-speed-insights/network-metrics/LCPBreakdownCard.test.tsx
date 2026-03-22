import type React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LCPBreakdownCard } from '@/features/page-speed-insights/network-metrics/LCPBreakdownCard';

vi.mock('recharts', async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

describe('LCPBreakdownCard', () => {
  it('returns null when metrics empty', () => {
    const { container } = render(<LCPBreakdownCard metrics={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when metrics have no lcp-breakdown-insight audit', () => {
    const { container } = render(
      <LCPBreakdownCard
        metrics={[
          { item: { lighthouseResult: { audits: {} } } as any, label: 'Desktop' },
        ]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders table and chart when metrics have breakdown data', () => {
    const { container } = render(
      <LCPBreakdownCard
        metrics={[
          {
            item: {
              lighthouseResult: {
                audits: {
                  'lcp-breakdown-insight': {
                    details: {
                      items: [
                        {
                          type: 'table',
                          items: [
                            {
                              subpart: 'timeToFirstByte',
                              label: 'TTFB',
                              duration: 100,
                            },
                            {
                              subpart: 'resourceLoadDuration',
                              label: 'Resource Load',
                              duration: 200,
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            } as any,
            label: 'Desktop',
          },
        ]}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
