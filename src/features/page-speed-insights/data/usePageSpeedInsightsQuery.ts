'use client';
import { useSuspenseQuery } from '@tanstack/react-query';
import type { PageSpeedInsights } from '@/lib/schema';
import { parsePageSpeedInsightsArrayFromText } from '@/lib/page-speed-insights/parsePageSpeedInsightsResponse';

/** Result when the saved-report API returns an error envelope instead of PSI rows. */
export type PageSpeedInsightsQueryData =
  | (PageSpeedInsights | null | undefined)[]
  | { status: 'failed' };

type PageSpeedInsightsDefaultData = (PageSpeedInsights | null | undefined)[];

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

function usePageSpeedInsightsQueryBase(
  queryKey: readonly [string, 'url' | 'publicId', string],
  queryFn: ({ signal }: { signal: AbortSignal }) => Promise<PageSpeedInsightsQueryData>,
  defaultData?: PageSpeedInsightsDefaultData,
) {
  const hasDefaultData = !!defaultData?.filter(Boolean).length;
  const { data, isLoading } = useSuspenseQuery({
    queryKey,
    queryFn,
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

export function usePageSpeedInsightsQueryByUrl(
  url: string,
  defaultData?: PageSpeedInsightsDefaultData,
) {
  return usePageSpeedInsightsQueryBase(
    ['pagespeed', 'url', url] as const,
    ({ signal }) => fetchPageSpeedByUrl(url, signal),
    defaultData,
  );
}

export function usePageSpeedInsightsQueryByPublicId(publicId: string) {
  return usePageSpeedInsightsQueryBase(
    ['pagespeed', 'publicId', publicId] as const,
    ({ signal }) => fetchPageSpeedByPublicId(publicId, signal),
  );
}
