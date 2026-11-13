import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectPageSpeedUserLabelsToken, selectPageSpeedUserLabelFilterToken } = vi.hoisted(() => ({
  selectPageSpeedUserLabelsToken: Symbol("selectPageSpeedUserLabels"),
  selectPageSpeedUserLabelFilterToken: Symbol("selectPageSpeedUserLabelFilter"),
}));

const resetColumnFiltersMock = vi.fn<() => void>();
const resetUserLabelFilterMock = vi.fn<() => void>();

let dashboardState = {
  items: [] as Array<{ label: string; item: Record<string, unknown> }>,
  reportTitle: "Report title",
};

let tableRows = [{ id: "row-1" }, { id: "row-2" }];

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  PageSpeedInsightsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePageSpeedUserLabelFilterActions: () => ({
    resetUserLabelFilter: resetUserLabelFilterMock,
    setUserLabelFilter: vi.fn<() => void>(),
  }),
  usePageSpeedItems: () => dashboardState.items,
  usePageSpeedReportTitle: () => dashboardState.reportTitle,
  usePageSpeedSelector: (selector: unknown) => {
    if (selector === selectPageSpeedUserLabelsToken) return [];
    if (selector === selectPageSpeedUserLabelFilterToken) return null;
    return undefined;
  },
  selectPageSpeedUserLabels: selectPageSpeedUserLabelsToken,
  selectPageSpeedUserLabelFilter: selectPageSpeedUserLabelFilterToken,
}));

vi.mock("@/components/common/LoadingMessage", () => ({
  LoadingMessage: () => <div>Mock loading message</div>,
}));

vi.mock("@/features/page-speed-insights/page-load-timeline/PageLoadTimeline", () => ({
  PageLoadTimeline: () => <div>Page load timeline</div>,
}));

vi.mock("@/features/page-speed-insights/dashboard-view/OverviewTabPanel", () => ({
  OverviewTabPanel: () => <div>Overview story</div>,
}));

vi.mock("@/features/page-speed-insights/dashboard-view/loading-story/LoadingStory", () => ({
  LoadingStory: () => <div>Loading story</div>,
}));

vi.mock("@/features/page-speed-insights/dashboard-view/resources-story/ResourcesStory", () => ({
  ResourcesStory: () => <div>Resources story</div>,
}));

vi.mock(
  "@/features/page-speed-insights/dashboard-view/recommendations-story/RecommendationsStory",
  () => ({
    RecommendationsStory: () => <div>Recommendations story</div>,
  }),
);

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
    getColumn: () => ({
      getFilterValue: () => "",
      setFilterValue: vi.fn<() => void>(),
    }),
    resetColumnFilters: () => resetColumnFiltersMock(),
    getRowModel: () => ({ rows: tableRows }),
  }),
  CategoryRow: ({ row }: { row: { id: string } }) => <div>Category row: {row.id}</div>,
}));

import { PageSpeedInsightsDashboard } from "@/features/page-speed-insights/pageSpeedInsightsDashboard";

describe("pageSpeedInsightsDashboard", () => {
  beforeEach(() => {
    dashboardState = {
      items: [],
      reportTitle: "Loaded report",
    };
    tableRows = [{ id: "row-1" }, { id: "row-2" }];
    resetColumnFiltersMock.mockReset();
    resetUserLabelFilterMock.mockReset();
    window.localStorage.clear();
  });

  function selectTab(name: string | RegExp) {
    fireEvent.mouseDown(screen.getByRole("tab", { name }));
  }

  it("opens on the overview tab", async () => {
    render(<PageSpeedInsightsDashboard data={[]} labels={[]} />);

    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("Overview story")).toBeInTheDocument();
    expect(screen.queryByText("Category row: row-1")).not.toBeInTheDocument();
  });

  it("shows grouped sections when switching dashboard tabs", async () => {
    render(<PageSpeedInsightsDashboard data={[]} labels={[]} />);

    selectTab("Timeline");
    expect(await screen.findByText("Page load timeline")).toBeInTheDocument();

    selectTab("Loading");
    expect(await screen.findByText("Loading story")).toBeInTheDocument();

    selectTab("Resources");
    expect(await screen.findByText("Resources story")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Network" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "JavaScript" })).not.toBeInTheDocument();

    selectTab("Recommendations");
    expect(await screen.findByText("Recommendations story")).toBeInTheDocument();

    selectTab("Audits");
    expect(await screen.findByText("Category row: row-1")).toBeInTheDocument();
  });

  it("renders score overview cards for each report", () => {
    dashboardState.items = [
      {
        label: "Mobile",
        item: {
          lighthouseResult: {
            categories: { performance: { title: "Performance", score: 0.42 } },
            audits: {
              "largest-contentful-paint": {
                title: "Largest Contentful Paint",
                displayValue: "4.1 s",
                score: 0.3,
              },
            },
          },
        },
      },
    ];
    render(<PageSpeedInsightsDashboard data={[]} labels={[]} />);

    const overview = screen.getByRole("region", { name: "Score overview" });
    expect(overview).toHaveTextContent("Mobile");
    expect(screen.getByRole("img", { name: "Performance: 42" })).toBeInTheDocument();
    expect(overview).toHaveTextContent("LCP");
    expect(overview).toHaveTextContent("4.1 s");
  });

  it("writes the selected tab into the URL", async () => {
    render(<PageSpeedInsightsDashboard data={[]} labels={[]} />);
    selectTab("Resources");

    expect(new URLSearchParams(window.location.search).get("tab")).toBe("resources");
    expect(await screen.findByText("Resources story")).toBeInTheDocument();
  });

  it("renders the report title and label filter", () => {
    render(<PageSpeedInsightsDashboard data={[]} labels={[]} />);

    expect(screen.getByRole("heading", { level: 2, name: "Loaded report" })).toBeInTheDocument();
    expect(screen.getByText("User label filter")).toBeInTheDocument();
  });

  it("calls resetColumnFilters when Reset filters is clicked", async () => {
    dashboardState.items = [{ label: "test", item: {} }];
    render(<PageSpeedInsightsDashboard data={[]} labels={[]} />);
    selectTab("Audits");

    fireEvent.click(await screen.findByRole("button", { name: /reset filters/i }));

    expect(resetColumnFiltersMock).toHaveBeenCalledTimes(1);
    expect(resetUserLabelFilterMock).toHaveBeenCalledTimes(1);
  });
});
