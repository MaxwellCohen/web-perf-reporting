import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePageSpeedInsightsQueryByPublicId } from "@/features/page-speed-insights/data/usePageSpeedInsightsQuery";

const sharedQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
  },
});

const createWrapper = () => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: sharedQueryClient }, children);
  };
};

describe("usePageSpeedInsightsQueryByPublicId", () => {
  beforeEach(() => {
    sharedQueryClient.clear();
  });

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

    const { result } = renderHook(() => usePageSpeedInsightsQueryByPublicId("public-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current).toEqual({
      isLoading: false,
      result: { status: "ok", data: mockData },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pagespeed/public-123",
      expect.objectContaining({ method: "GET" }),
    );
    fetchMock.mockRestore();
  });

  it("returns failed status when response status is 500", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Server error",
    } as Response);

    const { result } = renderHook(() => usePageSpeedInsightsQueryByPublicId("public-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current).toEqual({
      isLoading: false,
      result: { status: "failed" },
    });
    fetchMock.mockRestore();
  });

  it("returns failed status with error message from JSON 500 body", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: async () =>
        JSON.stringify({
          status: "failed",
          error: "Lighthouse could not load the page.",
          url: "https://example.com/page",
        }),
    } as Response);

    const { result } = renderHook(() => usePageSpeedInsightsQueryByPublicId("public-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current).toEqual({
      isLoading: false,
      result: {
        status: "failed",
        error: "Lighthouse could not load the page.",
        url: "https://example.com/page",
      },
    });
    fetchMock.mockRestore();
  });

  it("returns failed status when response JSON is invalid", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => "invalid json",
    } as Response);

    const { result } = renderHook(() => usePageSpeedInsightsQueryByPublicId("public-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current).toEqual({
      isLoading: false,
      result: {
        status: "failed",
        error: "The PageSpeed Insights response could not be parsed.",
      },
    });
    fetchMock.mockRestore();
  });
});
