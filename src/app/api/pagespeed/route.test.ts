import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/pagespeed/route';

describe('app/api/pagespeed route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a validation error when the request url is invalid', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await POST({
      json: async () => ({ testURL: 'not-a-url' }),
    } as any);

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe('Internal server error');
  });

  it('returns the completed page speed payload from the worker', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'completed', data: '{"ok":true}' }),
    } as Response);

    const response = await POST({
      json: async () => ({ testURL: 'https://example.com' }),
    } as any);

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('{"ok":true}');
  });

  it('returns error when fetch is not ok', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 502,
    } as Response);

    const response = await POST({
      json: async () => ({ testURL: 'https://example.com' }),
    } as any);

    expect(response.status).toBe(502);
    await expect(response.text()).resolves.toBe('Error fetching data');
  });

  it('returns 404 when worker returns no data', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => null,
    } as Response);

    const response = await POST({
      json: async () => ({ testURL: 'https://example.com' }),
    } as any);

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe('Data is not yet ready no data');
  });

  it('returns 500 when status is completed but data.data is missing', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'completed' }),
    } as Response);

    const response = await POST({
      json: async () => ({ testURL: 'https://example.com' }),
    } as any);

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe('');
  });

  it('returns a not-ready error when the worker status is not completed', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'PENDING' }),
    } as Response);

    const response = await POST({
      json: async () => ({ testURL: 'https://example.com' }),
    } as any);

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toContain('Data is not yet ready');
  });
});
