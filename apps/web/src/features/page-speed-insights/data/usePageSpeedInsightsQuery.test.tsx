import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { Suspense, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePageSpeedInsightsQueryByPublicId } from "@/features/page-speed-insights/data/usePageSpeedInsightsQuery";
import type { PageSpeedLoadResult } from "@/lib/page-speed-insights/pageSpeedInsightsClient";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function HookProbe({
  publicId,
  onResult,
}: {
  publicId: string;
  onResult: (state: PageSpeedLoadResult) => void;
}) {
  const state = usePageSpeedInsightsQueryByPublicId(publicId);
  onResult(state);
  return <div data-testid="hook-result">{JSON.stringify(state)}</div>;
}

function HookProbeProviders({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div data-testid="suspense-fallback">loading</div>}>{children}</Suspense>
    </QueryClientProvider>
  );
}

async function renderHookProbe(publicId: string, queryClient = createQueryClient()) {
  let latest: PageSpeedLoadResult | undefined;
  await act(async () => {
    render(
      <HookProbeProviders queryClient={queryClient}>
        <HookProbe
          publicId={publicId}
          onResult={(state) => {
            latest = state;
          }}
        />
      </HookProbeProviders>,
    );
  });
  return {
    getLatest: () => latest,
  };
}

describe("usePageSpeedInsightsQueryByPublicId", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and returns ok result when publicId is provided", async () => {
    const mockData = [
      {
        lighthouseResult: { finalDisplayedUrl: "https://example.com" },
      },
    ];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockData),
    } as Response);

    const { getLatest } = await renderHookProbe("public-123");

    expect(screen.getByTestId("hook-result")).toBeInTheDocument();
    expect(getLatest()).toEqual({ status: "ok", data: mockData });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pagespeed/public-123",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("returns failed status when response status is 500", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Server error",
    } as Response);

    const { getLatest } = await renderHookProbe("public-123");

    expect(screen.getByTestId("hook-result")).toBeInTheDocument();
    expect(getLatest()).toEqual({ status: "failed" });
  });

  it("returns failed status with error message from JSON 500 body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: async () =>
        JSON.stringify({
          status: "failed",
          error: "Lighthouse could not load the page.",
          url: "https://example.com/page",
        }),
    } as Response);

    const { getLatest } = await renderHookProbe("public-123");

    expect(screen.getByTestId("hook-result")).toBeInTheDocument();
    expect(getLatest()).toEqual({
      status: "failed",
      error: "Lighthouse could not load the page.",
      url: "https://example.com/page",
    });
  });

  it("returns failed status when response JSON is invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "invalid json",
    } as Response);

    const { getLatest } = await renderHookProbe("public-123");

    expect(screen.getByTestId("hook-result")).toBeInTheDocument();
    expect(getLatest()).toEqual({
      status: "failed",
      error: "The PageSpeed Insights response could not be parsed.",
    });
  });

  it("reuses the cached query across renders for a publicId", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify([]),
    } as Response);

    const queryClient = createQueryClient();
    await renderHookProbe("public-123", queryClient);
    await renderHookProbe("public-123", queryClient);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
