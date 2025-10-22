import { PageSpeedInsights } from '@/lib/schema';
import useSWR from 'swr';

export function useFetchPageSpeedData(
  url: string,
  defaultData?: (PageSpeedInsights | null | undefined)[],
) {
  const hasDefaultData = !!defaultData?.filter(Boolean).length;
  const { data, isLoading } = useSWR<(PageSpeedInsights | undefined | null)[]>(
    [`/api/pagespeed`, url],
    () => fetcher(url),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      isPaused: () => !!hasDefaultData || !url,
      onErrorRetry: (
        error: { message: string },
        key,
        config,
        revalidate,
        { retryCount },
      ) => {
        if (error.message.includes('Data is not yet ready')) {
          // Retry after 5 seconds.
          setTimeout(() =>{
            revalidate({ retryCount 
            })}, 5000);
        }
        // Only retry up to 10 times.
        if (retryCount >= 10) return;
      },
    },
  );

  if (hasDefaultData) {
    return { data: defaultData, isLoading: false };
  }

  return { data, isLoading };
}

async function fetcher(url: string) {
  const res = await fetch('/api/pagespeed', {
    mode: 'no-cors',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      testURL: url,
    }),
  });

  // If the status code is not in the range 200-299,
  // we still try to parse and throw it.
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
