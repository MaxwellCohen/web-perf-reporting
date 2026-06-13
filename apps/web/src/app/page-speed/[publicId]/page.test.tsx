import { render, screen, waitFor } from "@testing-library/react";
import { type ComponentType, type ReactNode, useEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<ComponentType<unknown> | Record<string, ComponentType<unknown>>>) => {
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

vi.mock("@/components/common/ErrorMessage", () => ({
  ErrorMessage: ({ children }: { children?: ReactNode }) => (
    <div data-testid="error-message">{children}</div>
  ),
}));

import PageSpeedPublicIdPage from "./page";

describe("page-speed [publicId] page", () => {
  it("awaits params and renders wrapper with publicId", async () => {
    usePageSpeedInsightsQueryMock.mockReturnValue({
      isLoading: false,
      result: {
        status: "ok",
        data: [
          {
            lighthouseResult: { finalDisplayedUrl: "https://example.com" },
            analysisUTCTimestamp: "2024-01-01T00:00:00.000Z",
          },
        ],
      },
    });

    const component = await PageSpeedPublicIdPage({
      params: Promise.resolve({ publicId: "report-xyz-123" }),
    });

    const { container } = render(component);

    await waitFor(() => {
      expect(screen.getByTestId("page-speed-dashboard")).toBeInTheDocument();
    });
    expect(container.firstChild).toMatchSnapshot();
    expect(usePageSpeedInsightsQueryMock).toHaveBeenCalledWith("report-xyz-123");
  });
});
