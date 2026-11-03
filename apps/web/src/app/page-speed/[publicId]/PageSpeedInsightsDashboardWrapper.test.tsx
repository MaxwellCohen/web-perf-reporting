import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ComponentType, useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PageSpeedInsightsDashboardContent } from "./PageSpeedInsightsDashboardWrapper";

vi.mock("next/dynamic", () => ({
  default: (
    loader: () => Promise<ComponentType<unknown> | Record<string, ComponentType<unknown>>>,
  ) => {
    return function DynamicComponent(props: Record<string, unknown>) {
      const [Component, setComponent] = useState<ComponentType<unknown> | null>(null);

      useEffect(() => {
        void loader().then((resolved) => {
          const nextComponent =
            typeof resolved === "function"
              ? resolved
              : (resolved.PageSpeedInsightsDashboard ?? resolved.default ?? null);
          setComponent(() => nextComponent);
        });
      }, []);

      return Component ? <Component {...props} /> : null;
    };
  },
}));

const usePageSpeedInsightsQueryMock = vi.fn<(publicId: string) => unknown>();
const pushMock = vi.fn<(path: string) => void>();
const requestPageSpeedDataMock = vi.fn<(url: string) => Promise<string>>();
const resetMock = vi.fn<(id: string) => void>();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

vi.mock("@/lib/services/pageSpeedInsights.service", () => ({
  requestPageSpeedData: (url: string) => requestPageSpeedDataMock(url),
}));

vi.mock("@/lib/page-speed-insights/pageSpeedInsightsClient", () => ({
  resetPageSpeedInsightsByPublicId: (id: string) => resetMock(id),
}));

vi.mock("@/features/page-speed-insights/data/usePageSpeedInsightsQuery", () => ({
  usePageSpeedInsightsQueryByPublicId: (publicId: string) =>
    usePageSpeedInsightsQueryMock(publicId),
}));

vi.mock("@/features/page-speed-insights/pageSpeedInsightsDashboard", () => ({
  PageSpeedInsightsDashboard: ({ data, labels }: { data: unknown[]; labels: string[] }) => (
    <div data-testid="page-speed-dashboard">
      Dashboard with {data.length} items, labels: {labels.join(", ")}
    </div>
  ),
}));

vi.mock("@/components/common/LoadingMessage", () => ({
  LoadingMessage: () => <div data-testid="loading-message">Loading</div>,
}));

const createMockPageSpeedData = () => [
  {
    lighthouseResult: { finalDisplayedUrl: "https://example.com" },
    analysisUTCTimestamp: "2024-01-01T00:00:00.000Z",
  },
];

describe("PageSpeedInsightsDashboardContent", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.mocked(console.error).mockRestore();
  });

  it("passes publicId to usePageSpeedInsightsQuery", () => {
    usePageSpeedInsightsQueryMock.mockReturnValue({ status: "ok", data: [] });

    render(<PageSpeedInsightsDashboardContent publicId="test-id-123" />);

    expect(usePageSpeedInsightsQueryMock).toHaveBeenCalledWith("test-id-123");
  });

  it("renders dashboard with empty ok data", async () => {
    usePageSpeedInsightsQueryMock.mockReturnValue({ status: "ok", data: [] });

    const { container } = render(<PageSpeedInsightsDashboardContent publicId="test-id" />);

    await waitFor(() => {
      expect(screen.getByTestId("page-speed-dashboard")).toBeInTheDocument();
    });
    expect(container.firstChild).toMatchSnapshot();
  });

  it("shows worker error message when report status is failed", async () => {
    usePageSpeedInsightsQueryMock.mockReturnValue({
      status: "failed",
      error: "Lighthouse could not load the page.",
      url: "https://example.com/page",
    });

    const { container } = render(<PageSpeedInsightsDashboardContent publicId="test-id" />);

    await waitFor(() => {
      expect(container.firstChild).toMatchSnapshot();
    });
    expect(screen.getByText("Failed to Load Report")).toBeInTheDocument();
    expect(screen.getByText("Lighthouse could not load the page.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://example.com/page" })).toHaveAttribute(
      "href",
      "https://example.com/page",
    );
    expect(screen.getByRole("link", { name: "Try Again" })).toBeInTheDocument();
  });

  it("shows generic error when failed status has no error detail", async () => {
    usePageSpeedInsightsQueryMock.mockReturnValue({ status: "failed" });

    render(<PageSpeedInsightsDashboardContent publicId="test-id" />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "We couldn't load the PageSpeed Insights data. This might be due to a temporary issue or the report might not be available.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("renders dashboard when client-side with valid data", async () => {
    const mockData = createMockPageSpeedData();
    usePageSpeedInsightsQueryMock.mockReturnValue({ status: "ok", data: mockData });

    const { container } = render(<PageSpeedInsightsDashboardContent publicId="test-id" />);

    await waitFor(() => {
      expect(screen.getByTestId("page-speed-dashboard")).toBeInTheDocument();
    });
    expect(container.firstChild).toMatchSnapshot();
  });

  it("offers Retry on timeouts and re-fetches the report", () => {
    usePageSpeedInsightsQueryMock.mockReturnValue({
      status: "failed",
      reason: "timeout",
      error: "Still running.",
    });

    render(<PageSpeedInsightsDashboardContent publicId="retry-id" />);
    expect(screen.queryByRole("button", { name: "Run again" })).not.toBeInTheDocument();

    usePageSpeedInsightsQueryMock.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(resetMock).toHaveBeenCalledWith("retry-id");
    expect(usePageSpeedInsightsQueryMock).toHaveBeenCalledWith("retry-id");
  });

  it("offers Run again on failed jobs and starts a new run for the same URL", async () => {
    requestPageSpeedDataMock.mockResolvedValue("new-id");
    usePageSpeedInsightsQueryMock.mockReturnValue({
      status: "failed",
      reason: "job",
      error: "Lighthouse could not load the page.",
      url: "https://example.com/page",
    });

    render(<PageSpeedInsightsDashboardContent publicId="failed-id" />);
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Run again" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/page-speed/new-id"));
    expect(requestPageSpeedDataMock).toHaveBeenCalledWith("https://example.com/page");
  });

  it("does not offer Run again for a failed job without a URL", () => {
    usePageSpeedInsightsQueryMock.mockReturnValue({ status: "failed", reason: "job" });

    render(<PageSpeedInsightsDashboardContent publicId="no-url" />);

    expect(screen.queryByRole("button", { name: "Run again" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try Again" })).toBeInTheDocument();
  });
});
