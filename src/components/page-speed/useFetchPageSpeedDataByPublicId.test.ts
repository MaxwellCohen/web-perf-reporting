import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageSpeedInsights } from '@/lib/schema';
import { useFetchPageSpeedDataByPublicId } from '@/components/page-speed/useFetchPageSpeedDataByPublicId';

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

describe('useFetchPageSpeedDataByPublicId', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns defaultData and isLoading false when hasDefaultData', () => {
    const defaultData = [
      {
        lighthouseResult: { finalDisplayedUrl: 'https://example.com' },
      },
    ] as (PageSpeedInsights | null | undefined)[];
    const { result } = renderHook(
      () => useFetchPageSpeedDataByPublicId('public-123', defaultData),
      {
        wrapper: createWrapper(),
      },
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
      () => useFetchPageSpeedDataByPublicId('public-123'),
      {
        wrapper: createWrapper(),
      },
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
      () => useFetchPageSpeedDataByPublicId('public-123'),
      {
        wrapper: createWrapper(),
      },
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
      () => useFetchPageSpeedDataByPublicId('public-123'),
      {
        wrapper: createWrapper(),
      },
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
