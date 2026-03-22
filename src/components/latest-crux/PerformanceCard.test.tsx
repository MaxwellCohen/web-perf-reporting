import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  CartesianGrid: () => null,
  Rectangle: () => null,
  XAxis: () => null,
}));

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

vi.mock('@/components/common/PageSpeedGaugeChart', () => ({
  default: () => <div data-testid="gauge-chart" />,
}));

vi.mock('@/components/latest-crux/charts/CruxRadialChart', () => ({
  CruxRadialChart: () => <div data-testid="radial-chart" />,
}));

vi.mock('@/components/latest-crux/charts/CruxStackedBarChart', () => ({
  PerformanceStackedBarChart: () => <div data-testid="stacked-bar-chart" />,
}));

import {
  CurrentPerformanceCard,
  CurrentPerformanceChartContext,
  ChartMap,
  HorizontalScoreChart,
} from '@/components/latest-crux/PerformanceCard';

const histogramData = {
  good_density: 0.5,
  ni_density: 0.3,
  poor_density: 0.2,
  good_max: 1000,
  ni_max: 2000,
  P75: 900,
};

describe('CurrentPerformanceCard', () => {
  it('returns null when histogramData is undefined', () => {
    const { container } = render(
      <CurrentPerformanceChartContext.Provider value="Histogram">
        <CurrentPerformanceCard title="LCP" histogramData={undefined} />
      </CurrentPerformanceChartContext.Provider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders Histogram chart when context is Histogram', () => {
    const { container } = render(
      <CurrentPerformanceChartContext.Provider value="Histogram">
        <CurrentPerformanceCard
          title="Largest Contentful Paint"
          histogramData={histogramData as any}
        />
      </CurrentPerformanceChartContext.Provider>
    );
    expect(container.textContent).toContain('Largest Contentful Paint');
    expect(container.textContent).toContain('900');
    expect(container.textContent).toContain('Good: 0 to 1000');
  });

  it('renders Gauge Chart when context is Gauge Chart', () => {
    const { container } = render(
      <CurrentPerformanceChartContext.Provider value="Gauge Chart">
        <CurrentPerformanceCard
          title="LCP"
          histogramData={histogramData as any}
        />
      </CurrentPerformanceChartContext.Provider>
    );
    expect(container.querySelector('[data-testid="gauge-chart"]')).toBeTruthy();
  });

  it('renders Stacked Bar when context is Stacked Bar', () => {
    const { container } = render(
      <CurrentPerformanceChartContext.Provider value="Stacked Bar">
        <CurrentPerformanceCard
          title="LCP"
          histogramData={histogramData as any}
        />
      </CurrentPerformanceChartContext.Provider>
    );
    expect(container.querySelector('[data-testid="stacked-bar-chart"]')).toBeTruthy();
  });

  it('renders Radial Chart when context is Radial Chart', () => {
    const { container } = render(
      <CurrentPerformanceChartContext.Provider value="Radial Chart">
        <CurrentPerformanceCard
          title="LCP"
          histogramData={histogramData as any}
        />
      </CurrentPerformanceChartContext.Provider>
    );
    expect(container.querySelector('[data-testid="radial-chart"]')).toBeTruthy();
  });

  it('shows Needs Improvement status when P75 is between good_max and ni_max', () => {
    const { container } = render(
      <CurrentPerformanceChartContext.Provider value="Histogram">
        <CurrentPerformanceCard
          title="LCP"
          histogramData={{ ...histogramData, P75: 1500 } as any}
        />
      </CurrentPerformanceChartContext.Provider>
    );
    expect(container.textContent).toContain('Needs Improvement');
  });

  it('shows Poor status when P75 exceeds ni_max', () => {
    const { container } = render(
      <CurrentPerformanceChartContext.Provider value="Histogram">
        <CurrentPerformanceCard
          title="LCP"
          histogramData={{ ...histogramData, P75: 2500 } as any}
        />
      </CurrentPerformanceChartContext.Provider>
    );
    expect(container.textContent).toContain('Poor');
  });

  it('shows N/A when P75 is undefined', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <CurrentPerformanceChartContext.Provider value="Histogram">
        <CurrentPerformanceCard
          title="LCP"
          histogramData={{ ...histogramData, P75: undefined } as any}
        />
      </CurrentPerformanceChartContext.Provider>
    );
    expect(container.textContent).toContain('N/A');
    vi.restoreAllMocks();
  });
});

describe('ChartMap', () => {
  it('contains expected chart types', () => {
    expect(ChartMap).toHaveProperty('Histogram');
    expect(ChartMap).toHaveProperty('Stacked Bar');
    expect(ChartMap).toHaveProperty('Radial Chart');
    expect(ChartMap).toHaveProperty('Gauge Chart');
  });
});

describe('HorizontalScoreChart', () => {
  it('renders with score', () => {
    const { container } = render(<HorizontalScoreChart score={0.75} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders with className', () => {
    const { container } = render(
      <HorizontalScoreChart score={0.5} className="custom" />
    );
    expect(container.querySelector('.custom')).toBeTruthy();
  });
});
