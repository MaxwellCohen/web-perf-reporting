import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateUrlMock = vi.fn<(value: string | undefined) => string | undefined>();
const requestPageSpeedDataMock = vi.fn<(value: string) => Promise<string>>();
const redirectMock = vi.fn<(path: string) => void>();

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
  updateURl: (value: string | undefined) => updateUrlMock(value),
  normalizedCruxUrlFromSearchParams: async (
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>,
  ) => {
    const params = await searchParams;
    return updateUrlMock(params.url as string);
  },
}));

vi.mock("@/lib/services/pageSpeedInsights.service", () => ({
  requestPageSpeedData: (value: string) => requestPageSpeedDataMock(value),
}));

vi.mock("@/components/viewer/ViewerPage", () => ({
  default: () => <div>Mock viewer page</div>,
}));

vi.mock("@/components/common/UrlLookupForm", () => ({
  UrlLookupForm: () => <div>Mock URL lookup form</div>,
}));

vi.mock("@/components/latest-crux/CurrentPerformanceSection", () => ({
  CurrentPerformanceSection: ({ url }: { url: string }) => <div>Current performance for {url}</div>,
}));

vi.mock("@/components/historical/HistoricalChartsSection", () => ({
  HistoricalChartsSection: ({ url }: { url: string }) => <div>Historical charts for {url}</div>,
}));

vi.mock("@/app/page-speed/[publicId]/PageSpeedInsightsDashboardWrapper", () => ({
  PageSpeedInsightsDashboardContent: ({ publicId }: { publicId: string }) => (
    <div>Dashboard wrapper for {publicId}</div>
  ),
}));

import HistoricalCruxPage from "@/app/historical-crux/page";
import Home from "@/app/page";
import LatestCruxPage from "@/app/latest-crux/page";
import PageSpeedLayout from "@/app/page-speed/layout";
import PageSpeedPage from "@/app/page-speed/page";
import PageSpeedPublicIdPage from "@/app/page-speed/[publicId]/page";

describe("app page coverage smoke tests", () => {
  beforeEach(() => {
    updateUrlMock.mockReset();
    requestPageSpeedDataMock.mockReset();
    redirectMock.mockReset();
  });

  it("renders the home page cards and destination links", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Let your agent make your site fast" }),
    ).toBeInTheDocument();
  });

  it("renders the page speed layout shell and nested content", async () => {
    render(
      await PageSpeedLayout({
        children: <div>Nested page speed content</div>,
      }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Page Speed Insights" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nested page speed content")).toBeInTheDocument();
  });

  it("passes the public id to the dashboard wrapper page", async () => {
    render(
      await PageSpeedPublicIdPage({
        params: Promise.resolve({ publicId: "abc123" }),
      }),
    );

    expect(screen.getByText("Dashboard wrapper for abc123")).toBeInTheDocument();
  });

  it("renders latest crux lookup when there is no normalized url", async () => {
    updateUrlMock.mockReturnValue(undefined);

    render(await LatestCruxPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Latest Crux Report" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mock URL lookup form")).toBeInTheDocument();
  });

  it("renders latest crux results when a normalized url exists", async () => {
    updateUrlMock.mockReturnValue("https://example.com");

    render(
      await LatestCruxPage({
        searchParams: Promise.resolve({ url: "https://example.com" }),
      }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Latest Crux Report for https://example.com" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Current performance for https://example.com")).toBeInTheDocument();
  });

  it("renders historical crux lookup or dashboard from the normalized url", async () => {
    updateUrlMock.mockReturnValueOnce(undefined).mockReturnValueOnce("https://example.com");

    render(await HistoricalCruxPage({ searchParams: Promise.resolve({}) }));
    render(
      await HistoricalCruxPage({
        searchParams: Promise.resolve({ url: "https://example.com" }),
      }),
    );

    expect(screen.getAllByText("Mock URL lookup form")).toHaveLength(1);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Historical CrUX reports for https://example.com",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Historical charts for https://example.com")).toBeInTheDocument();
  });

  it("renders the page speed page with the viewer input", async () => {
    render(await PageSpeedPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Mock viewer page")).toBeInTheDocument();
  });
});
