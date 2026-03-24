import { beforeEach, describe, expect, it, vi } from 'vitest';

const captureExceptionMock = vi.fn();
const executeMock = vi.fn();
const whereMock = vi.fn(() => ({ execute: executeMock }));
const deleteMock = vi.fn((_arg: unknown) => ({ where: whereMock }));
const findFirstMock = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureException: (error: unknown) => captureExceptionMock(error),
}));

vi.mock('@/db/schema', () => ({
  PageSpeedInsightsTable: {
    url: 'url',
    status: 'status',
    date: 'date',
  },
}));

vi.mock('@/db', () => ({
  db: {
    query: {
      PageSpeedInsightsTable: {
        findFirst: (opts: unknown) => findFirstMock(opts),
      },
    },
    delete: (arg: unknown) => deleteMock(arg),
  },
}));

vi.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => ({ type: 'and', args }),
  eq: (...args: unknown[]) => ({ type: 'eq', args }),
}));

import {
  getPageSpeedDataUrl,
  getSavedPageSpeedData,
  requestPageSpeedData,
} from '@/lib/services/pageSpeedInsights.service';

describe('pageSpeedInsights.service', () => {
  beforeEach(() => {
    captureExceptionMock.mockReset();
    executeMock.mockReset();
    whereMock.mockClear();
    deleteMock.mockClear();
    findFirstMock.mockReset();
    vi.restoreAllMocks();
  });

  it('builds the google pagespeed url with categories and strategy', async () => {
    const url = await getPageSpeedDataUrl('https://example.com/home', 'DESKTOP');

    expect(url).toContain('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    expect(url).toContain('url=https%3A%2F%2Fexample.com%2Fhome');
    expect(url).toContain('strategy=DESKTOP');
    expect(url).toContain('category=PERFORMANCE');
    expect(url).toContain('category=SEO');
  });

  it('returns the saved page speed record when the database query succeeds', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    findFirstMock.mockResolvedValue({
      status: 'completed',
      data: '{"ok":true}',
    });

    const result = await getSavedPageSpeedData('https://example.com');

    expect(findFirstMock).toHaveBeenCalled();
    expect(result).toEqual({
      status: 'completed',
      data: '{"ok":true}',
    });
  });

  it('captures errors when the saved page speed query fails', async () => {
    findFirstMock.mockRejectedValue(new Error('db failed'));

    const result = await getSavedPageSpeedData('https://example.com');

    expect(result).toBeNull();
    expect(captureExceptionMock).toHaveBeenCalled();
  });

  it('returns null when no test url is provided', async () => {
    await expect(requestPageSpeedData(undefined)).resolves.toBeNull();
  });

  it('requests fresh page speed data and returns the public id', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        publicId: 'public-123',
        status: 'completed',
        url: 'https://example.com',
        data: [],
      }),
    } as Response);

    const result = await requestPageSpeedData('https://example.com');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('web-perf-report-cf.to-email-max.workers.dev'),
    );
    expect(result).toBe('public-123');
  });

  it('captures errors and cleans up pending measurements when the request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const result = await requestPageSpeedData('https://example.com');

    expect(result).toBeNull();
    expect(captureExceptionMock).toHaveBeenCalled();
    expect(deleteMock).toHaveBeenCalled();
    expect(whereMock).toHaveBeenCalled();
    expect(executeMock).toHaveBeenCalled();
  });
});
