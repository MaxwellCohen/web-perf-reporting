import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateUrlMock = vi.fn();
const requestPageSpeedDataMock = vi.fn();
const redirectMock = vi.fn();

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
  updateURl: (value: string | undefined) => updateUrlMock(value),
}));

vi.mock("@/lib/services/pageSpeedInsights.service", () => ({
  requestPageSpeedData: (value: string) => requestPageSpeedDataMock(value),
}));

vi.mock("@/components/lh/LhInputForm", () => ({
  LhInputForm: () => <div>Mock LH input form</div>,
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
import LhPage from "@/app/lh/page";
import LatestCruxPage from "@/app/latest-crux/page";
import PageSpeedLayout from "@/app/page-speed/layout";
import PageSpeedPage from "@/app/page-speed/page";
import PageSpeedPublicIdPage from "@/app/page-speed/[publicId]/page";
import ViewerPage from "@/app/viewer/page";

describe("app page coverage smoke tests", () => {
  beforeEach(() => {
    updateUrlMock.mockReset();
    requestPageSpeedDataMock.mockReset();
    redirectMock.mockReset();
  });

  it("renders the home page cards and destination links", () => {
    const { container } = render(<Home />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders the lightweight lh and viewer pages", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    render(await LhPage({ route: "lh" }));
    const { container } = render(await ViewerPage({ route: "viewer" }));

    expect(container.firstChild).toMatchSnapshot();
    expect(logSpy).toHaveBeenCalledTimes(2);

    logSpy.mockRestore();
  });

  it("renders the page speed layout shell and nested content", async () => {
    const { container } = render(
      await PageSpeedLayout({
        children: <div>Nested page speed content</div>,
      }),
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it("passes the public id to the dashboard wrapper page", async () => {
    const { container } = render(
      await PageSpeedPublicIdPage({
        params: Promise.resolve({ publicId: "abc123" }),
      }),
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders latest crux lookup when there is no normalized url", async () => {
    updateUrlMock.mockReturnValue(undefined);

    const { container } = render(await LatestCruxPage({ searchParams: Promise.resolve({}) }));

    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders latest crux results when a normalized url exists", async () => {
    updateUrlMock.mockReturnValue("https://example.com");

    const { container } = render(
      await LatestCruxPage({
        searchParams: Promise.resolve({ url: "https://example.com" }),
      }),
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders historical crux lookup or dashboard from the normalized url", async () => {
    updateUrlMock.mockReturnValueOnce(undefined).mockReturnValueOnce("https://example.com");

    render(await HistoricalCruxPage({ searchParams: Promise.resolve({}) }));
    const { container } = render(
      await HistoricalCruxPage({
        searchParams: Promise.resolve({ url: "https://example.com" }),
      }),
    );

    expect(screen.getAllByText("Mock URL lookup form")).toHaveLength(1);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders the page speed lookup form when no URL is present", async () => {
    updateUrlMock.mockReturnValue(undefined);

    const { container } = render(await PageSpeedPage({ searchParams: Promise.resolve({}) }));

    expect(container.firstChild).toMatchSnapshot();
    expect(requestPageSpeedDataMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("requests a report and redirects when the page speed URL resolves", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    updateUrlMock.mockReturnValue("https://example.com");
    requestPageSpeedDataMock.mockResolvedValue("public-123");

    render(
      await PageSpeedPage({
        searchParams: Promise.resolve({ url: "https://example.com" }),
      }),
    );

    expect(requestPageSpeedDataMock).toHaveBeenCalledWith("https://example.com");
    expect(redirectMock).toHaveBeenCalledWith("/page-speed/public-123");
    expect(logSpy).toHaveBeenCalledWith("redirecting to /page-speed/public-123");

    logSpy.mockRestore();
  });
});
