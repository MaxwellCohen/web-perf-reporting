import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ dataKey }: { dataKey: string }) => <div data-testid={`bar-${dataKey}`}>{dataKey}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: ({ tickFormatter }: { tickFormatter?: (v: string) => string }) => (
    <div data-testid="x-axis">
      {tickFormatter ? tickFormatter('2024-01-31') : ''}
    </div>
  ),
}));

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: () => <div data-testid="chart-tooltip" />,
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content" />,
}));

import { HistoricalPerformanceBarChart } from '@/components/historical/HistoricalPerformanceBarChart';

const chartData = [
  {
    date: '2024-01-31',
    good_density: 0.5,
    ni_density: 0.3,
    poor_density: 0.2,
  },
];

describe('HistoricalPerformanceBarChart', () => {
  it('renders chart with chartData and formats date ticks', () => {
    const { container } = render(
      <HistoricalPerformanceBarChart chartData={chartData as any} />
    );
    expect(container.querySelector('[data-testid="bar-chart"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="x-axis"]')).toBeTruthy();
    expect(container.textContent).toContain('202');
  });
});
