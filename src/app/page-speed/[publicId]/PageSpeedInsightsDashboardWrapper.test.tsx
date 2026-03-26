import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { PageSpeedInsightsDashboardContent } from "./PageSpeedInsightsDashboardWrapper";

const usePageSpeedInsightsQueryMock = vi.fn();

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
    usePageSpeedInsightsQueryMock.mockReturnValue({
      data: [],
      isLoading: true,
    });

    render(<PageSpeedInsightsDashboardContent publicId="test-id-123" />);

    expect(usePageSpeedInsightsQueryMock).toHaveBeenCalledWith("test-id-123");
  });

  it("shows loading when isLoading is true", async () => {
    usePageSpeedInsightsQueryMock.mockReturnValue({
      data: [],
      isLoading: true,
    });

    const { container } = render(<PageSpeedInsightsDashboardContent publicId="test-id" />);

    await waitFor(() => {
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  it("shows loading when data is empty or has no truthy items", async () => {
    usePageSpeedInsightsQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { container } = render(<PageSpeedInsightsDashboardContent publicId="test-id" />);

    await waitFor(() => {
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  it("shows loading when data has only null/undefined items", async () => {
    usePageSpeedInsightsQueryMock.mockReturnValue({
      data: [null, undefined],
      isLoading: false,
    });

    const { container } = render(<PageSpeedInsightsDashboardContent publicId="test-id" />);

    await waitFor(() => {
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  it("shows error when data is not an array", async () => {
    usePageSpeedInsightsQueryMock.mockReturnValue({
      data: { status: "failed" },
      isLoading: false,
    });

    const { container } = render(
      <ErrorMessage>
        <PageSpeedInsightsDashboardContent publicId="test-id" />
      </ErrorMessage>,
    );

    await waitFor(() => {
      expect(container.firstChild).toMatchSnapshot();
    });
    expect(screen.getByText("Failed to Load Report")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try Again" })).toBeInTheDocument();
  });

  it("renders dashboard when client-side with valid data", async () => {
    const mockData = createMockPageSpeedData();
    usePageSpeedInsightsQueryMock.mockReturnValue({
      data: mockData,
      isLoading: false,
    });

    const { container } = render(<PageSpeedInsightsDashboardContent publicId="test-id" />);

    await waitFor(() => {
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
