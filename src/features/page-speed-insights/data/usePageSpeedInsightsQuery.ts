'use client';

import { useQuery } from '@tanstack/react-query';
import type { PageSpeedInsights } from '@/lib/schema';
import { parsePageSpeedInsightsArrayFromText } from '@/lib/page-speed-insights/parsePageSpeedInsightsResponse';

export type PageSpeedInsightsQuerySource =
  | { mode: 'url'; url: string }
  | { mode: 'publicId'; publicId: string };

/** Result when the saved-report API returns an error envelope instead of PSI rows. */
export type PageSpeedInsightsQueryData =
  | (PageSpeedInsights | null | undefined)[]
  | { status: 'failed' };

async function fetchPageSpeedByUrl(url: string, signal: AbortSignal) {
  const res = await fetch('/api/pagespeed', {
    mode: 'no-cors',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ testURL: url }),
    signal,
  });

  if (!res.ok) {
    const message = await res.text();
    throw { status: res.status, message };
  }
  const text = await res.text();
  return parsePageSpeedInsightsArrayFromText(text);
}

async function fetchPageSpeedByPublicId(
  publicId: string,
  signal: AbortSignal,
): Promise<PageSpeedInsightsQueryData> {
  const res = await fetch(`/api/pagespeed/${publicId}`, {
    mode: 'no-cors',
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal,
  });

  if (res.status === 500) {
    return { status: 'failed' as const };
  }

  if (!res.ok) {
    const message = await res.text();
    throw { status: res.status, message };
  }

  const text = await res.text();
  return parsePageSpeedInsightsArrayFromText(text);
}

/**
 * Loads PageSpeed Insights JSON arrays from `/api/pagespeed` (URL) or `/api/pagespeed/:id` (saved report).
 */
export function usePageSpeedInsightsQuery(
  source: PageSpeedInsightsQuerySource,
  defaultData?: (PageSpeedInsights | null | undefined)[],
) {
  const hasDefaultData = !!defaultData?.filter(Boolean).length;

  const urlMode = source.mode === 'url';
  const key = urlMode
    ? (['pagespeed', 'url', source.url] as const)
    : (['pagespeed', 'publicId', source.publicId] as const);

  const enabled = urlMode
    ? !!source.url && !hasDefaultData
    : !!source.publicId && !hasDefaultData;

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: ({ signal }) =>
      urlMode
        ? fetchPageSpeedByUrl(source.url, signal)
        : fetchPageSpeedByPublicId(source.publicId, signal),
    enabled,
    initialData: hasDefaultData ? defaultData : undefined,
    retryDelay: 3000,
  });

  if (hasDefaultData) {
    return { data: defaultData, isLoading: false };
  }
  return {
    data: (data ??
      []) as PageSpeedInsightsQueryData,
    isLoading,
  };
}
