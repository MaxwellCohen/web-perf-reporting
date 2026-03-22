import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TimelineCard } from '@/features/page-speed-insights/network-metrics/TimelineCard';

vi.mock('@/features/page-speed-insights/lh-categories/table/RenderTableValue', () => ({
  RenderMSValue: ({ value }: { value: number }) => (
    <span data-testid="ms-value">{value} ms</span>
  ),
}));

describe('TimelineCard', () => {
  it('returns null when metrics is empty', () => {
    const { container } = render(<TimelineCard metrics={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when metrics have no event data', () => {
    const { container } = render(
      <TimelineCard
        metrics={[
          { label: 'Desktop' },
          { label: 'Mobile' },
        ]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders card with timeline table when metrics have event data', () => {
    const { container } = render(
      <TimelineCard
        metrics={[
          {
            label: 'Desktop',
            ttfb: 100,
            fcp: 500,
            observedNavigationStart: 0,
          },
        ]}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders multiple report columns when multiple metrics', () => {
    const { container } = render(
      <TimelineCard
        metrics={[
          { label: 'Desktop', ttfb: 80, fcp: 400, observedNavigationStart: 0 },
          { label: 'Mobile', ttfb: 120, fcp: 600, observedNavigationStart: 0 },
        ]}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows N/A for missing values in report columns', () => {
    const { container } = render(
      <TimelineCard
        metrics={[
          {
            label: 'Desktop',
            ttfb: 100,
            observedNavigationStart: 0,
            observedFirstPaint: 200,
          },
        ]}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
