import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  selectPageSpeedIsLoadingToken,
  selectPageSpeedItemsToken,
  selectPageSpeedReportTitleToken,
} = vi.hoisted(() => ({
  selectPageSpeedIsLoadingToken: Symbol('selectPageSpeedIsLoading'),
  selectPageSpeedItemsToken: Symbol('selectPageSpeedItems'),
  selectPageSpeedReportTitleToken: Symbol('selectPageSpeedReportTitle'),
}));

const usePageSpeedInsightsQueryMock = vi.fn();
const resetColumnFiltersMock = vi.fn();

let dashboardState = {
  isLoading: false,
  items: [] as Array<{ label: string; item: Record<string, unknown> }>,
  reportTitle: 'Report title',
};

let tableRows = [{ id: 'row-1' }, { id: 'row-2' }];

vi.mock('@/features/page-speed-insights/PageSpeedContext', () => ({
  PageSpeedInsightsStoreProvider: ({
    children,
  }: {
    children: React.ReactNode;
    store: unknown;
  }) => <>{children}</>,
  selectPageSpeedIsLoading: selectPageSpeedIsLoadingToken,
  selectPageSpeedItems: selectPageSpeedItemsToken,
  selectPageSpeedReportTitle: selectPageSpeedReportTitleToken,
  usePageSpeedInsightsStore: () => ({ id: 'store' }),
}));

vi.mock('@xstate/store-react', () => ({
  useSelector: (_store: unknown, selector: symbol) => {
    if (selector === selectPageSpeedIsLoadingToken) {
      return dashboardState.isLoading;
    }
    if (selector === selectPageSpeedItemsToken) {
      return dashboardState.items;
    }
    if (selector === selectPageSpeedReportTitleToken) {
      return dashboardState.reportTitle;
    }
    return undefined;
  },
}));

vi.mock('@/features/page-speed-insights/data/usePageSpeedInsightsQuery', () => ({
  usePageSpeedInsightsQuery: (source: { mode: string; url?: string }, data: unknown[]) =>
    usePageSpeedInsightsQueryMock(source, data),
}));

vi.mock('@/components/common/LoadingMessage', () => ({
  LoadingMessage: () => <div>Mock loading message</div>,
}));

vi.mock('@/features/page-speed-insights/LoadingExperience', () => ({
  LoadingExperience: ({ title }: { title: string }) => (
    <div>Loading experience: {title}</div>
  ),
}));

vi.mock('@/features/page-speed-insights/lh-categories/table/EntitiesTable', () => ({
  EntitiesTable: () => <div>Entities table</div>,
}));

vi.mock('@/features/page-speed-insights/CWVMetricsComponent', () => ({
  CWVMetricsComponent: () => <div>CWV metrics</div>,
}));

vi.mock('@/features/page-speed-insights/RenderFilmStrip', () => ({
  RenderFilmStrip: () => <div>Film strip</div>,
}));

vi.mock('@/features/page-speed-insights/NetworkMetrics', () => ({
  NetworkMetricsComponent: () => <div>Network metrics</div>,
}));

vi.mock('@/features/page-speed-insights/javascript-metrics/JavaScriptPerformanceComponent', () => ({
  JavaScriptPerformanceComponent: () => <div>JavaScript metrics</div>,
}));

vi.mock('@/features/page-speed-insights/RecommendationsSection', () => ({
  RecommendationsSection: () => <div>Recommendations section</div>,
}));

vi.mock('@/features/page-speed-insights/JSUsage/JSUsageTable', () => ({
  StringFilterHeader: ({ name }: { name: string }) => <div>String filter: {name}</div>,
}));

vi.mock('@/features/page-speed-insights/JSUsage/TableControls', () => ({
  DropdownFilter: ({ columnId }: { columnId: string }) => (
    <div>Dropdown filter: {columnId}</div>
  ),
}));

vi.mock('@/features/page-speed-insights/tsTable/useLHTable', () => ({
  useLHTable: () => ({
    getColumn: (columnId: string) => ({ columnId }),
    resetColumnFilters: () => resetColumnFiltersMock(),
    getRowModel: () => ({ rows: tableRows }),
  }),
  CategoryRow: ({ row }: { row: { id: string } }) => <div>Category row: {row.id}</div>,
}));

import { PageSpeedInsightsDashboard } from '@/features/page-speed-insights/pageSpeedInsightsDashboard';

describe('pageSpeedInsightsDashboard', () => {
  beforeEach(() => {
    dashboardState = {
      isLoading: false,
      items: [],
      reportTitle: 'Loaded report',
    };
    tableRows = [{ id: 'row-1' }, { id: 'row-2' }];
    usePageSpeedInsightsQueryMock.mockReset();
    resetColumnFiltersMock.mockReset();
    usePageSpeedInsightsQueryMock.mockReturnValue({ data: [], isLoading: false });
  });

  it('shows the loading state when the dashboard is still fetching', () => {
    dashboardState.isLoading = true;

    const { container } = render(
      <PageSpeedInsightsDashboard data={[]} labels={['Mobile']} url="https://example.com" />,
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders the dashboard sections, copy buttons, and category rows when data is ready', () => {
    dashboardState.items = [
      { label: 'Mobile', item: { id: 'mobile' } },
      { label: 'Desktop', item: { id: 'desktop' } },
    ];

    const { container } = render(
      <PageSpeedInsightsDashboard
        data={[{ id: 1 } as any]}
        labels={['Mobile', 'Desktop']}
        url="https://example.com"
      />,
    );

    expect(usePageSpeedInsightsQueryMock).toHaveBeenCalledWith(
      { mode: 'url', url: 'https://example.com' },
      [{ id: 1 }],
    );
    expect(container.firstChild).toMatchSnapshot();

    const resetButton = Array.from(container.querySelectorAll('button')).find(
      (btn) => /reset filters/i.test(btn.textContent ?? ''),
    );
    fireEvent.click(resetButton!);
    expect(resetColumnFiltersMock).toHaveBeenCalled();
  });
});
