import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  selectPageSpeedIsLoadingToken,
  selectPageSpeedItemsToken,
  selectPageSpeedReportTitleToken,
} = vi.hoisted(() => ({
  selectPageSpeedIsLoadingToken: Symbol("selectPageSpeedIsLoading"),
  selectPageSpeedItemsToken: Symbol("selectPageSpeedItems"),
  selectPageSpeedReportTitleToken: Symbol("selectPageSpeedReportTitle"),
}));

const resetColumnFiltersMock = vi.fn();
const resetUserLabelFilterMock = vi.fn();

let dashboardState = {
  isLoading: false,
  items: [] as Array<{ label: string; item: Record<string, unknown> }>,
  reportTitle: "Report title",
};

let tableRows = [{ id: "row-1" }, { id: "row-2" }];

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  PageSpeedInsightsStoreProvider: ({ children }: { children: React.ReactNode; store: unknown }) => (
    <>{children}</>
  ),
  selectPageSpeedIsLoading: selectPageSpeedIsLoadingToken,
  selectPageSpeedItems: selectPageSpeedItemsToken,
  selectPageSpeedReportTitle: selectPageSpeedReportTitleToken,
  usePageSpeedInsightsStore: () => ({
    id: "store",
    trigger: { resetUserLabelFilter: resetUserLabelFilterMock },
  }),
  useRequiredPageSpeedInsightsStore: () => ({
    id: "store",
    trigger: { resetUserLabelFilter: resetUserLabelFilterMock },
  }),
  usePageSpeedItems: () => dashboardState.items,
  usePageSpeedReportTitle: () => dashboardState.reportTitle,
}));

vi.mock("@xstate/store-react", () => ({
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

vi.mock("@/components/common/LoadingMessage", () => ({
  LoadingMessage: () => <div>Mock loading message</div>,
}));

vi.mock("@/features/page-speed-insights/loading-experience/LoadingExperience", () => ({
  LoadingExperience: ({ title }: { title: string }) => <div>Loading experience: {title}</div>,
}));

vi.mock("@/features/page-speed-insights/lh-categories/table/EntitiesTable", () => ({
  EntitiesTable: () => <div>Entities table</div>,
  EntitiesTableCard: () => <div>Entities table card</div>,
  useEntitiesTableData: () => ({ data: [], columns: [], hasEntities: false }),
}));

vi.mock("@/features/page-speed-insights/CWVMetricsComponent", () => ({
  CWVMetricsComponent: () => <div>CWV metrics</div>,
}));

vi.mock("@/features/page-speed-insights/RenderFilmStrip", () => ({
  RenderFilmStrip: () => <div>Film strip</div>,
}));

vi.mock("@/features/page-speed-insights/script-treemap", () => ({
  ScriptTreemapSection: () => <div>Script treemap section</div>,
}));

vi.mock("@/features/page-speed-insights/network-metrics", () => ({
  LoadTimelineSection: () => <div>Load timeline section</div>,
  NetworkWaterfallSection: () => <div>Network waterfall section</div>,
  NetworkResourcesSection: () => <div>Network resources section</div>,
  NetworkMetricsComponent: () => <div>Network metrics</div>,
}));

vi.mock("@/features/page-speed-insights/javascript-metrics/JavaScriptPerformanceComponent", () => ({
  JavaScriptPerformanceComponent: () => <div>JavaScript metrics</div>,
}));

vi.mock("@/features/page-speed-insights/RecommendationsSection", () => ({
  RecommendationsSection: () => <div>Recommendations section</div>,
}));

vi.mock("@/features/page-speed-insights/tanstack-table-v9/StringFilterHeader", () => ({
  StringFilterHeader: ({ name }: { name: string }) => <div>String filter: {name}</div>,
}));

vi.mock("@/features/page-speed-insights/UserLabelFilter", () => ({
  UserLabelFilter: () => <div>User label filter</div>,
}));

vi.mock("@/features/page-speed-insights/PageSpeedInsightsCopyButtons", () => ({
  PageSpeedInsightsCopyButtons: () => <div>Copy buttons</div>,
}));

vi.mock("@/features/page-speed-insights/tsTable/useLHTable", () => ({
  useLHTable: () => ({
    getColumn: (columnId: string) => ({ columnId }),
    resetColumnFilters: () => resetColumnFiltersMock(),
    getRowModel: () => ({ rows: tableRows }),
  }),
  CategoryRow: ({ row }: { row: { id: string } }) => <div>Category row: {row.id}</div>,
}));

import { PageSpeedInsightsDashboard } from "@/features/page-speed-insights/pageSpeedInsightsDashboard";

describe("pageSpeedInsightsDashboard", () => {
  beforeEach(() => {
    dashboardState = {
      isLoading: false,
      items: [],
      reportTitle: "Loaded report",
    };
    tableRows = [{ id: "row-1" }, { id: "row-2" }];
    resetColumnFiltersMock.mockReset();
    resetUserLabelFilterMock.mockReset();
  });

  it("renders report title and mocked sections", () => {
    render(<PageSpeedInsightsDashboard data={[]} labels={[]} />);

    expect(screen.getByRole("heading", { level: 2, name: "Loaded report" })).toBeInTheDocument();
    expect(screen.getByText("User label filter")).toBeInTheDocument();
    expect(screen.getByText("Film strip")).toBeInTheDocument();
    expect(screen.getByText("Script treemap section")).toBeInTheDocument();
    expect(screen.getByText("Load timeline section")).toBeInTheDocument();
    expect(screen.getByText("Network waterfall section")).toBeInTheDocument();
    expect(screen.getByText("Network resources section")).toBeInTheDocument();
    expect(screen.getByText("CWV metrics")).toBeInTheDocument();
    expect(screen.getByText("Category row: row-1")).toBeInTheDocument();
  });

  it("calls resetColumnFilters when Reset filters is clicked", () => {
    dashboardState.items = [{ label: "test", item: {} }];
    render(<PageSpeedInsightsDashboard data={[]} labels={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /reset filters/i }));

    expect(resetColumnFiltersMock).toHaveBeenCalledTimes(1);
    expect(resetUserLabelFilterMock).toHaveBeenCalledTimes(1);
  });
});
