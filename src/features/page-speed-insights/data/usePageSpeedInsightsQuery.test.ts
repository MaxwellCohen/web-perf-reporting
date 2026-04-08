import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PageSpeedInsights } from "@/lib/schema";
import {
  usePageSpeedInsightsQueryByPublicId,
  usePageSpeedInsightsQueryByUrl,
} from "@/features/page-speed-insights/data/usePageSpeedInsightsQuery";

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

/** useQuery + throwOnError: capture errors for assertions. */
function createThrowErrorWrapper(capture: { error: unknown }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  class ErrorCatcher extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    state = { hasError: false };

    static getDerivedStateFromError() {
      return { hasError: true };
    }

    componentDidCatch(error: unknown) {
      capture.error = error;
    }

    render() {
      if (this.state.hasError) return null;
      return this.props.children;
    }
  }

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(ErrorCatcher, null, children),
    );
  };
}

describe("usePageSpeedInsightsQuery", () => {
  beforeEach(() => {
    sharedQueryClient.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("url mode", () => {
    it("returns defaultData and isLoading false when hasDefaultData", () => {
      const defaultData = [
        {
          lighthouseResult: { finalDisplayedUrl: "https://example.com" },
        },
      ] as (PageSpeedInsights | null | undefined)[];
      const { result } = renderHook(
        () => usePageSpeedInsightsQueryByUrl("https://example.com", defaultData),
        { wrapper: createWrapper() },
      );

      expect(result.current.data).toEqual(defaultData);
      expect(result.current.isLoading).toBe(false);
    });

    it("returns defaultData when defaultData has items (filtered)", () => {
      const defaultData = [null, { lighthouseResult: {} }] as (
        | PageSpeedInsights
        | null
        | undefined
      )[];
      const { result } = renderHook(() => usePageSpeedInsightsQueryByUrl("", defaultData), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toEqual(defaultData);
      expect(result.current.isLoading).toBe(false);
    });

    it("does not use defaultData when it is empty", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      } as Response);

      const { result } = renderHook(
        () => usePageSpeedInsightsQueryByUrl("https://example.com", []),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.data).toEqual([]);
      fetchMock.mockRestore();
    });

    it("fetches and returns data when url is provided", async () => {
      const mockData = [
        {
          lighthouseResult: { finalDisplayedUrl: "https://example.com" },
        },
      ];
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockData),
      } as Response);

      const { result } = renderHook(() => usePageSpeedInsightsQueryByUrl("https://example.com"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.data).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/pagespeed",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ testURL: "https://example.com" }),
        }),
      );
      fetchMock.mockRestore();
    });

    it("throws when response is not ok (throwOnError + error boundary)", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Server error",
      } as Response);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const capture: { error: unknown } = { error: undefined };
      renderHook(() => usePageSpeedInsightsQueryByUrl("https://example.com"), {
        wrapper: createThrowErrorWrapper(capture),
      });

      await waitFor(() => {
        expect(capture.error).toBeDefined();
      });
      expect(capture.error).toMatchObject({ status: 500, message: "Server error" });
      consoleSpy.mockRestore();
      fetchMock.mockRestore();
    });

    it("returns empty array when response JSON is invalid", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        text: async () => "invalid json",
      } as Response);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { result } = renderHook(() => usePageSpeedInsightsQueryByUrl("https://example.com"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.data).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      fetchMock.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe("publicId mode", () => {
    it("fetches and returns data when publicId is provided", async () => {
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
      expect(result.current.data).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/pagespeed/public-123",
        expect.objectContaining({
          method: "GET",
        }),
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
      expect(result.current.data).toEqual({ status: "failed" });
      fetchMock.mockRestore();
    });

    it("returns empty array when response JSON is invalid", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        text: async () => "invalid json",
      } as Response);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { result } = renderHook(() => usePageSpeedInsightsQueryByPublicId("public-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.data).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      fetchMock.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});
