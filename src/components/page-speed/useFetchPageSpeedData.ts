'use client';
import { PageSpeedInsights } from '@/lib/schema';
import { useEffect, useTransition, useState } from 'react';


export function useFetchPageSpeedData(
  url: string,
  defaultData?: (PageSpeedInsights | null | undefined)[],
) {
  const hasDefaultData = !!defaultData?.filter(Boolean).length;
  const [data, setData] = useState<(PageSpeedInsights | null | undefined)[]>([]);
  const [pending, startTransition] = useTransition();
  const [initialLoad, setInitialLoad] = useState(true);
  const [tryCount, setTryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setInitialLoad(false)
    startTransition(async () => {
      try {
        console.log('fetching data');
        const res = await fetcher(url, controller.signal);
        setData(res);
      } catch (e) {
        console.log('Error fetching PageSpeed Insights data:', e);
        setTimeout(() => setTryCount((tryCount) => tryCount + 1), 3000);
      }
    });
    return () => controller.abort();
  }, [url, tryCount]);

  if (hasDefaultData) {
    return { data: defaultData, isLoading: false };
  }
  return { data, isLoading: initialLoad || pending };
}

async function fetcher(url: string, signal: AbortSignal) {
  const res = await fetch('/api/pagespeed', {
    mode: 'no-cors',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      testURL: url,
    }),
    signal,
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
