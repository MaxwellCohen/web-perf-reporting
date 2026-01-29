'use client';
import { PageSpeedInsights } from '@/lib/schema';
import { useQuery } from '@tanstack/react-query';

async function fetcher(publicId: string, signal: AbortSignal) {
  const res = await fetch(`/api/pagespeed/${publicId}`, {
    mode: 'no-cors',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
  });

  if (!res.ok) {
    const message = await res.text();
    throw {
      status: res.status,
      message,
    };
  }
  const urlObj = await res.text();
  try {
    const parsedData = JSON.parse(urlObj);
    if (Array.isArray(parsedData)) {
      return parsedData as (PageSpeedInsights | null | undefined)[];
    }
  } catch (error) {
    console.error('Error parsing PageSpeed Insights data:', error);
    return [];
  }

  return [];
}

export function useFetchPageSpeedDataByPublicId(
  publicId: string,
  defaultData?: (PageSpeedInsights | null | undefined)[],
) {
  const hasDefaultData = !!defaultData?.filter(Boolean).length;

  const { data, isLoading } = useQuery({
    queryKey: ['pagespeed', 'publicId', publicId],
    queryFn: ({ signal }) => fetcher(publicId, signal),
    enabled: !!publicId && !hasDefaultData,
    initialData: hasDefaultData ? defaultData : undefined,
    retryDelay: 3000,
  });

  if (hasDefaultData) {
    return { data: defaultData, isLoading: false };
  }
  return { data: data ?? [], isLoading };
}
