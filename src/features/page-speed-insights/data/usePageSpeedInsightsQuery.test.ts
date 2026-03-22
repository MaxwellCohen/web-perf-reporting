import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageSpeedInsights } from '@/lib/schema';
import { usePageSpeedInsightsQuery } from '@/features/page-speed-insights/data/usePageSpeedInsightsQuery';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('usePageSpeedInsightsQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('url mode', () => {
    it('returns defaultData and isLoading false when hasDefaultData', () => {
      const defaultData = [
        {
          lighthouseResult: { finalDisplayedUrl: 'https://example.com' },
        },
      ] as (PageSpeedInsights | null | undefined)[];
      const { result } = renderHook(
        () =>
          usePageSpeedInsightsQuery(
            { mode: 'url', url: 'https://example.com' },
            defaultData,
          ),
        { wrapper: createWrapper() },
      );

      expect(result.current.data).toEqual(defaultData);
      expect(result.current.isLoading).toBe(false);
    });

    it('returns defaultData when defaultData has items (filtered)', () => {
      const defaultData = [null, { lighthouseResult: {} }] as (PageSpeedInsights | null | undefined)[];
      const { result } = renderHook(
        () => usePageSpeedInsightsQuery({ mode: 'url', url: '' }, defaultData),
        { wrapper: createWrapper() },
      );

      expect(result.current.data).toEqual(defaultData);
      expect(result.current.isLoading).toBe(false);
    });

    it('does not use defaultData when it is empty', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify([]),
      } as Response);

      const { result } = renderHook(
        () => usePageSpeedInsightsQuery({ mode: 'url', url: 'https://example.com' }, []),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([]);
      fetchMock.mockRestore();
    });

    it('fetches and returns data when url is provided', async () => {
      const mockData = [
        {
          lighthouseResult: { finalDisplayedUrl: 'https://example.com' },
        },
      ];
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockData),
      } as Response);

      const { result } = renderHook(
        () => usePageSpeedInsightsQuery({ mode: 'url', url: 'https://example.com' }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/pagespeed',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ testURL: 'https://example.com' }),
        }),
      );
      fetchMock.mockRestore();
    });

    it('returns empty array when response is not ok', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      } as Response);

      const { result } = renderHook(
        () => usePageSpeedInsightsQuery({ mode: 'url', url: 'https://example.com' }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([]);
      fetchMock.mockRestore();
    });

    it('returns empty array when response JSON is invalid', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: async () => 'invalid json',
      } as Response);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(
        () => usePageSpeedInsightsQuery({ mode: 'url', url: 'https://example.com' }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      fetchMock.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('publicId mode', () => {
    it('returns defaultData and isLoading false when hasDefaultData', () => {
      const defaultData = [
        {
          lighthouseResult: { finalDisplayedUrl: 'https://example.com' },
        },
      ] as (PageSpeedInsights | null | undefined)[];
      const { result } = renderHook(
        () =>
          usePageSpeedInsightsQuery(
            { mode: 'publicId', publicId: 'public-123' },
            defaultData,
          ),
        { wrapper: createWrapper() },
      );

      expect(result.current.data).toEqual(defaultData);
      expect(result.current.isLoading).toBe(false);
    });

    it('fetches and returns data when publicId is provided', async () => {
      const mockData = [
        {
          lighthouseResult: { finalDisplayedUrl: 'https://example.com' },
        },
      ];
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockData),
      } as Response);

      const { result } = renderHook(
        () => usePageSpeedInsightsQuery({ mode: 'publicId', publicId: 'public-123' }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/pagespeed/public-123',
        expect.objectContaining({
          method: 'GET',
        }),
      );
      fetchMock.mockRestore();
    });

    it('returns failed status when response status is 500', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      } as Response);

      const { result } = renderHook(
        () => usePageSpeedInsightsQuery({ mode: 'publicId', publicId: 'public-123' }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual({ status: 'failed' });
      fetchMock.mockRestore();
    });

    it('returns empty array when response JSON is invalid', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: async () => 'invalid json',
      } as Response);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(
        () => usePageSpeedInsightsQuery({ mode: 'publicId', publicId: 'public-123' }),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      fetchMock.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});
