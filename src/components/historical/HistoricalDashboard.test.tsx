import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const formatCruxReportMock = vi.fn();
const groupByMock = vi.fn();

vi.mock('@/lib/utils', () => ({
  formatCruxReport: (...args: unknown[]) => formatCruxReportMock(...args),
  formatDate: (d: { year: number; month: number; day: number }) =>
    `${d.year}-${d.month}-${d.day}`,
  groupBy: (...args: unknown[]) => groupByMock(...args),
}));

vi.mock('@/components/common/FormFactorPercentPieChart', () => ({
  PercentTable: ({
    title,
    dateRange,
  }: {
    title: string;
    dateRange?: string;
  }) => <div data-testid="percent-table">{title}{dateRange ? ` - ${dateRange}` : ''}</div>,
}));

vi.mock('@/components/ui/accordion', () => ({
  Details: ({ children, ...props }: React.HTMLAttributes<HTMLDetailsElement>) => (
    <details open {...props}>{children}</details>
  ),
}));

vi.mock('@/components/latest-crux/PerformanceOptions', () => ({
  PerformanceOptions: ({
    setChartType,
    setReportScope,
    setDeviceType,
    chartKeys,
    dateRange,
    setDateRange,
    children,
  }: {
    setChartType: (v: string) => void;
    setReportScope: (v: string) => void;
    setDeviceType: (v: string) => void;
    chartKeys: string[];
    dateRange?: { startDate: string | null; endDate: string | null };
    setDateRange?: (r: { startDate: string | null; endDate: string | null }) => void;
    children?: React.ReactNode;
  }) => (
    <div data-testid="performance-options">
      <button type="button" onClick={() => setChartType('Area')}>Set Area</button>
      <button type="button" onClick={() => setReportScope('url')}>Set URL</button>
      <button type="button" onClick={() => setDeviceType('PHONE')}>Set Phone</button>
      <span>{chartKeys.join(',')}</span>
      {setDateRange && dateRange && (
        <input
          data-testid="date-range-input"
          value={dateRange.startDate || ''}
          onChange={(e) =>
            setDateRange({
              startDate: e.target.value || null,
              endDate: dateRange.endDate,
            })
          }
        />
      )}
      {children}
    </div>
  ),
}));

vi.mock('@/components/latest-crux/PerformanceCard', () => ({
  CurrentPerformanceChartContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

vi.mock('@/components/historical/HistoricalPerformanceCard', () => ({
  HistoricalPerformanceCard: ({
    title,
    histogramData,
  }: {
    title: string;
    histogramData: unknown;
  }) => (
    <div data-testid="historical-card">
      {title}
      {histogramData ? 'has-data' : 'no-data'}
    </div>
  ),
  ChartMap: { Area: () => null, 'Stacked Bar': () => null },
}));

import { HistoricalDashboard } from '@/components/historical/HistoricalDashboard';

const makeReport = (lastDate: { year: number; month: number; day: number }) => ({
  record: {
    collectionPeriod: {
      firstDate: { year: 2024, month: 1, day: 1 },
      lastDate,
    },
    metrics: {
      form_factors: { fractions: { desktop: 0.5, phone: 0.3, tablet: 0.2 } },
    },
  },
});

const historyItem = {
  end_date: '2024-01-31',
  good_density: 0.5,
  ni_density: 0.3,
  poor_density: 0.2,
  good_max: 1000,
  ni_max: 2000,
  P75: 900,
};

describe('HistoricalDashboard', () => {
  beforeEach(() => {
    formatCruxReportMock.mockReset();
    groupByMock.mockReset();
  });

  it('renders with empty report map', () => {
    formatCruxReportMock.mockReturnValue([]);
    groupByMock.mockReturnValue({});

    const { container } = render(
      <HistoricalDashboard
        reportMap={{
          originAll: [],
          originDESKTOP: [],
          originTABLET: [],
          originPHONE: [],
          urlAll: [],
          urlDESKTOP: [],
          urlTABLET: [],
          urlPHONE: [],
        } as any}
      />
    );

    expect(container.textContent).toContain('Historical CrUX Report for');
  });

  it('renders with reports and filters by date range', () => {
    const report1 = makeReport({ year: 2024, month: 1, day: 15 });
    const report2 = makeReport({ year: 2024, month: 1, day: 31 });
    const report3 = makeReport({ year: 2024, month: 2, day: 15 });

    formatCruxReportMock.mockImplementation((r: { record: { collectionPeriod: { lastDate: { year: number; month: number; day: number } } } }) => [
      { ...historyItem, end_date: `${r.record.collectionPeriod.lastDate.year}-${String(r.record.collectionPeriod.lastDate.month).padStart(2, '0')}-${String(r.record.collectionPeriod.lastDate.day).padStart(2, '0')}` },
    ]);
    groupByMock.mockReturnValue({
      largest_contentful_paint: [historyItem],
      interaction_to_next_paint: [historyItem],
      cumulative_layout_shift: [historyItem],
      first_contentful_paint: [historyItem],
      experimental_time_to_first_byte: [historyItem],
      round_trip_time: [historyItem],
    });

    const { container } = render(
      <HistoricalDashboard
        reportMap={{
          originAll: [report1, report2, report3] as any,
          originDESKTOP: [report1, report2, report3] as any,
          originTABLET: [report1, report2, report3] as any,
          originPHONE: [report1, report2, report3] as any,
          urlAll: [report1, report2, report3] as any,
          urlDESKTOP: [report1, report2, report3] as any,
          urlTABLET: [report1, report2, report3] as any,
          urlPHONE: [report1, report2, report3] as any,
        }}
      />
    );

    expect(container.textContent).toContain('Historical CrUX Report for');
    expect(container.textContent).toContain('Form Factors');
  });

  it('renders form factors with date range when available', () => {
    const report = makeReport({ year: 2024, month: 1, day: 31 });
    formatCruxReportMock.mockReturnValue([historyItem]);
    groupByMock.mockReturnValue({
      largest_contentful_paint: [historyItem],
      interaction_to_next_paint: [historyItem],
      cumulative_layout_shift: [historyItem],
      first_contentful_paint: [historyItem],
      experimental_time_to_first_byte: [historyItem],
      round_trip_time: [historyItem],
    });

    const { container } = render(
      <HistoricalDashboard
        reportMap={{
          originAll: [report] as any,
          originDESKTOP: [report] as any,
          originTABLET: [report] as any,
          originPHONE: [report] as any,
          urlAll: [report] as any,
          urlDESKTOP: [report] as any,
          urlTABLET: [report] as any,
          urlPHONE: [report] as any,
        }}
      />
    );

    expect(container.querySelector('[data-testid="percent-table"]')).toBeTruthy();
  });
});
