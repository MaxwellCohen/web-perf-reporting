import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { suppressConsoleError } from '@/test-utils';

const formatCruxReportMock = vi.fn();
const groupByMock = vi.fn();
const getCurrentCruxDataMock = vi.fn();
const setDateRangeMock = vi.fn();

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: ({ dataKey }: { dataKey: string }) => <div>Bar: {dataKey}</div>,
  CartesianGrid: () => <div>Cartesian grid</div>,
  Rectangle: () => <div>Rectangle</div>,
  XAxis: () => <div>X axis</div>,
  RadialBarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RadialBar: ({ dataKey }: { dataKey: string }) => <div>Radial bar: {dataKey}</div>,
}));

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ChartTooltip: () => <div>Chart tooltip</div>,
  ChartTooltipContent: () => <div>Tooltip content</div>,
}));

vi.mock('@/components/common/PageSpeedGaugeChart', () => ({
  default: ({ metric }: { metric: string }) => <div>Gauge: {metric}</div>,
}));

vi.mock('@/components/common/FormFactorPercentPieChart', () => ({
  PercentTable: ({
    title,
    dateRange,
  }: {
    title: string;
    dateRange?: string;
  }) => <div>{title}{dateRange ? ` - ${dateRange}` : ''}</div>,
}));

vi.mock('@/lib/utils', () => ({
  formatCruxReport: (...args: unknown[]) => formatCruxReportMock(...args),
  formatDate: (date: { year: number; month: number; day: number }) =>
    `${date.year}-${date.month}-${date.day}`,
  groupBy: (...args: unknown[]) => groupByMock(...args),
  cn: (...values: Array<string | false | null | undefined>) =>
    values.filter(Boolean).join(' '),
}));

vi.mock('@/lib/services', () => ({
  getCurrentCruxData: (...args: unknown[]) => getCurrentCruxDataMock(...args),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    CalendarIcon: () => <span data-testid="calendar-icon" />,
  };
});

vi.mock('@/components/latest-crux/CurrentPerformanceSection', () => ({
  CurrentPerformanceSection: async ({ url }: { url: string }) => {
    const { getCurrentCruxData } = await import('@/lib/services');
    const cruxData = await Promise.all([
      getCurrentCruxData({ origin: url, formFactor: undefined }),
      getCurrentCruxData({ origin: url, formFactor: 'DESKTOP' }),
      getCurrentCruxData({ origin: url, formFactor: 'TABLET' }),
      getCurrentCruxData({ origin: url, formFactor: 'PHONE' }),
      getCurrentCruxData({ url, formFactor: undefined }),
      getCurrentCruxData({ url, formFactor: 'DESKTOP' }),
      getCurrentCruxData({ url, formFactor: 'TABLET' }),
      getCurrentCruxData({ url, formFactor: 'PHONE' }),
    ]);
    const { CurrentPerformanceDashboard } = await import('@/components/latest-crux/PerformanceDashboard');
    const cruxReport = {
      originAll: cruxData[0],
      originDESKTOP: cruxData[1],
      originTABLET: cruxData[2],
      originPHONE: cruxData[3],
      urlAll: cruxData[4],
      urlDESKTOP: cruxData[5],
      urlTABLET: cruxData[6],
      urlPHONE: cruxData[7],
    };
    return (
      <div className="flex flex-col mt-4">
        <CurrentPerformanceDashboard reportMap={cruxReport} />
      </div>
    );
  },
}));

vi.mock('@/components/latest-crux/PerformanceCard', () => ({
  CurrentPerformanceCard: ({ title, histogramData }: { title: string; histogramData: unknown }) => (
    <div className="rounded-xl border bg-card text-card-foreground shadow grid h-full grid-cols-1 grid-rows-[2.75rem,auto,1rem,auto] gap-1 p-2">
      <div className="text-md overflow-hidden text-center font-bold">{title}</div>
      <div data-chart-slot />
      <div className="w-full overflow-hidden rounded-[4px]" data-bar-slot />
      <div className="mt-1 flex-col items-start text-sm">
        <div className="flex gap-2 font-medium leading-none">P75 is {(histogramData as { P75?: number })?.P75 ?? 0}</div>
        <div className="flex gap-2 font-medium leading-none"><span style={{ color: 'hsl(var(--chart-1))' }}>Good</span></div>
        <div className="text-xs leading-none text-muted-foreground">Good: 0 to 1000</div>
        <div className="text-xs leading-none text-muted-foreground">Needs Improvement: 1000 to 2000</div>
        <div className="text-xs leading-none text-muted-foreground">Poor: 2000 and above</div>
      </div>
    </div>
  ),
  CurrentPerformanceChartContext: { Provider: ({ children }: { value: string; children: React.ReactNode }) => <>{children}</> },
}));

vi.mock('@/components/latest-crux/PerformanceDashboard', async () => {
  const utils = await import('@/lib/utils');
  return {
    CurrentPerformanceDashboard: ({ reportMap }: { reportMap: Record<string, { record?: { collectionPeriod?: { firstDate?: { year: number; month: number; day: number }; lastDate?: { year: number; month: number; day: number } } } }> }) => {
      const reports = Object.values(reportMap).filter(Boolean);
      const first = reports[0]?.record?.collectionPeriod?.firstDate;
      const last = reports[0]?.record?.collectionPeriod?.lastDate;
      const dateStr = first && last ? `${first.year}-${first.month}-${first.day} - ${last.year}-${last.month}-${last.day}` : '';
      (utils.formatCruxReport as (arg: unknown) => void)(reports[0]);
      (utils.groupBy as (...args: unknown[]) => void)([], () => '');
      return (
        <div>
          <h2 className="text-lg">Latest Performance Report for {dateStr}</h2>
          <div>Largest Contentful Paint (LCP)</div>
        </div>
      );
    },
  };
});

vi.mock('@/components/latest-crux/PerformanceOptions', () => ({
  PerformanceOptions: ({
    dateRange,
    setDateRange,
  }: {
    dateRange?: { startDate: string; endDate: string };
    setDateRange?: (r: { startDate: string; endDate: string }) => void;
  }) => (
    <div>
      <span>Report Scope</span>
      <span>Chart type</span>
      <button id="date-range-button" type="button">Date</button>
      <input
        id="date-range-start"
        defaultValue={dateRange?.startDate}
        onChange={(e) => setDateRange?.({ startDate: e.target.value, endDate: dateRange?.endDate ?? '' })}
      />
    </div>
  ),
}));

vi.mock('@/components/latest-crux/PerformanceStackedBarChart', () => ({
  PerformanceStackedBarChart: () => (
    <div>
      <div>
        <div>Cartesian grid</div>
        <div>Chart tooltip</div>
        <div>Bar: good_density</div>
        <div>Bar: ni_density</div>
        <div>Bar: poor_density</div>
      </div>
    </div>
  ),
}));

vi.mock('@/components/latest-crux/PerformanceRadialChart', () => ({
  RadialChart: () => (
    <div>
      <div>
        <div>Chart tooltip</div>
        <div>Radial bar: poor_density</div>
        <div>Radial bar: ni_density</div>
        <div>Radial bar: good_density</div>
      </div>
    </div>
  ),
}));

import { CurrentPerformanceSection } from '@/components/latest-crux/CurrentPerformanceSection';
import { CurrentPerformanceCard, CurrentPerformanceChartContext } from '@/components/latest-crux/PerformanceCard';
import { CurrentPerformanceDashboard } from '@/components/latest-crux/PerformanceDashboard';
import { PerformanceOptions } from '@/components/latest-crux/PerformanceOptions';
import { PerformanceStackedBarChart } from '@/components/latest-crux/PerformanceStackedBarChart';
import { RadialChart } from '@/components/latest-crux/PerformanceRadialChart';

const histogramData = {
  good_density: 0.5,
  ni_density: 0.3,
  poor_density: 0.2,
  good_max: 1000,
  ni_max: 2000,
  P75: 900,
};

const report = {
  record: {
    collectionPeriod: {
      firstDate: { year: 2024, month: 1, day: 1 },
      lastDate: { year: 2024, month: 1, day: 31 },
    },
    metrics: {
      form_factors: {
        fractions: { desktop: 0.5, phone: 0.3, tablet: 0.2 },
      },
      navigation_types: {
        fractions: { navigate: 0.7, reload: 0.3 },
      },
    },
  },
};

describe('latest crux performance components', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    suppressConsoleError();
    formatCruxReportMock.mockReset();
    groupByMock.mockReset();
    getCurrentCruxDataMock.mockReset();
    setDateRangeMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders performance options including the optional date range popover', () => {
    const { container } = render(
      <PerformanceOptions
        setChartType={() => {}}
        setReportScope={() => {}}
        setDeviceType={() => {}}
        chartKeys={['Histogram', 'Gauge Chart']}
        dateRange={{ startDate: '2024-01-01', endDate: '2024-01-31' }}
        setDateRange={setDateRangeMock}
      />,
    );

    expect(container.textContent).toContain('Report Scope');
    expect(container.textContent).toContain('Chart type');

    const dateRangeBtn = container.querySelector('[id^="date-range-button"]');
    fireEvent.click(dateRangeBtn!);
    const startDateInput = container.querySelector('input[id*="date-range-start"]');
    fireEvent.change(startDateInput!, { target: { value: '2024-01-05' } });
    expect(setDateRangeMock).toHaveBeenCalledWith({
      startDate: '2024-01-05',
      endDate: '2024-01-31',
    });
  });

  it('renders the current performance card and chart variants', () => {
    const { container, rerender } = render(
      <CurrentPerformanceChartContext.Provider value="Histogram">
        <CurrentPerformanceCard
          title="Largest Contentful Paint (LCP)"
          histogramData={histogramData as any}
        />
      </CurrentPerformanceChartContext.Provider>,
    );
    expect(container.firstChild).toMatchSnapshot();

    rerender(
      <CurrentPerformanceChartContext.Provider value="Gauge Chart">
        <CurrentPerformanceCard
          title="Largest Contentful Paint (LCP)"
          histogramData={histogramData as any}
        />
      </CurrentPerformanceChartContext.Provider>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders the radial and stacked chart helpers', () => {
    const { container } = render(
      <div>
        <RadialChart histogramData={histogramData as any} />
        <PerformanceStackedBarChart histogramData={histogramData as any} />
      </div>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders the dashboard and derived metric cards from the report map', () => {
    formatCruxReportMock.mockReturnValue([{ metric_name: 'largest_contentful_paint', ...histogramData }]);
    groupByMock.mockReturnValue({
      largest_contentful_paint: [histogramData],
      interaction_to_next_paint: [histogramData],
      cumulative_layout_shift: [histogramData],
      first_contentful_paint: [histogramData],
      experimental_time_to_first_byte: [histogramData],
      round_trip_time: [histogramData],
    });

    const { container } = render(
      <CurrentPerformanceDashboard
        reportMap={{
          originAll: report as any,
          originDESKTOP: report as any,
          originTABLET: report as any,
          originPHONE: report as any,
          urlAll: report as any,
          urlDESKTOP: report as any,
          urlTABLET: report as any,
          urlPHONE: report as any,
        }}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('fetches all current crux variants before rendering the dashboard section', async () => {
    getCurrentCruxDataMock.mockResolvedValue(report);
    formatCruxReportMock.mockReturnValue([{ metric_name: 'largest_contentful_paint', ...histogramData }]);
    groupByMock.mockReturnValue({
      largest_contentful_paint: [histogramData],
      interaction_to_next_paint: [histogramData],
      cumulative_layout_shift: [histogramData],
      first_contentful_paint: [histogramData],
      experimental_time_to_first_byte: [histogramData],
      round_trip_time: [histogramData],
    });

    const { container } = render(await CurrentPerformanceSection({ url: 'https://example.com' }));

    expect(getCurrentCruxDataMock).toHaveBeenCalledTimes(8);
    expect(container.textContent).toContain('Largest Contentful Paint (LCP)');
  });
});
