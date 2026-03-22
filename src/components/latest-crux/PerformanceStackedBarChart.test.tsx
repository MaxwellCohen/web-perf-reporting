import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ dataKey }: { dataKey: string }) => (
    <div data-testid={`bar-${dataKey}`}>{dataKey}</div>
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
}));

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: () => <div data-testid="chart-tooltip" />,
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content" />,
}));

import { PerformanceStackedBarChart } from '@/components/latest-crux/charts/CruxStackedBarChart';

const histogramData = {
  good_density: 0.5,
  ni_density: 0.3,
  poor_density: 0.2,
  good_max: 1000,
  ni_max: 2000,
  P75: 900,
};

describe('PerformanceStackedBarChart', () => {
  it('renders chart with histogram data', () => {
    const { container } = render(
      <PerformanceStackedBarChart histogramData={histogramData as any} />
    );
    expect(container.querySelector('[data-testid="bar-chart"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="bar-good_density"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="bar-ni_density"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="bar-poor_density"]')).toBeTruthy();
  });

  it('handles null density values', () => {
    const { container } = render(
      <PerformanceStackedBarChart
        histogramData={{
          ...histogramData,
          good_density: undefined,
          ni_density: undefined,
          poor_density: undefined,
        } as any}
      />
    );
    expect(container.querySelector('[data-testid="bar-chart"]')).toBeTruthy();
  });
});
