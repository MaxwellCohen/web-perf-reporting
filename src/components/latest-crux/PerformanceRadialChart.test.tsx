import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => ({
  RadialBarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="radial-chart">{children}</div>
  ),
  RadialBar: ({ dataKey }: { dataKey: string }) => (
    <div data-testid={`radial-bar-${dataKey}`}>{dataKey}</div>
  ),
}));

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: () => <div data-testid="chart-tooltip" />,
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content" />,
}));

import { CruxRadialChart as RadialChart } from '@/components/latest-crux/charts/CruxRadialChart';

const histogramData = {
  good_density: 0.5,
  ni_density: 0.3,
  poor_density: 0.2,
  good_max: 1000,
  ni_max: 2000,
  P75: 900,
};

describe('RadialChart', () => {
  it('renders chart with histogram data', () => {
    const { container } = render(
      <RadialChart histogramData={histogramData as any} />
    );
    expect(container.querySelector('[data-testid="radial-chart"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="radial-bar-poor_density"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="radial-bar-ni_density"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="radial-bar-good_density"]')).toBeTruthy();
  });

  it('handles null density values', () => {
    const { container } = render(
      <RadialChart
        histogramData={{
          ...histogramData,
          good_density: undefined,
          ni_density: undefined,
          poor_density: undefined,
        } as any}
      />
    );
    expect(container.querySelector('[data-testid="radial-chart"]')).toBeTruthy();
  });
});
