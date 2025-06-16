import { PageSpeedInsights } from '@/lib/schema';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';

export function useFetchPageSpeedData(
  defaultData?: (PageSpeedInsights | null | undefined)[],
){
  const hasDefaultData = defaultData?.filter(Boolean).length;
  const searchParams = useSearchParams();
  const url = encodeURI(searchParams?.get('url') ?? '');
  const { data, isLoading } = useSWR<(PageSpeedInsights | undefined | null)[]>(
    [`/api/pagespeed`, url],
    () => fetcher(url),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      isPaused: () => !!hasDefaultData,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        console.log(error.message);
        if (error.message === 'Data is not yet ready') {
          // Retry after 5 seconds.
          setTimeout(() => revalidate({ retryCount }), 5000);
        }
        // Only retry up to 10 times.
        if (retryCount >= 10) return;
      },
    },
  );

  if (hasDefaultData) {
    return {data: defaultData, isLoading: false};
  }
return { data,  isLoading };
}

async function fetcher(url: string): Promise<(PageSpeedInsights | null | undefined)[]> {
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
  const urlObj = await res.json();
  if (!urlObj?.url) {
    throw new Error('No data found');
  }
  return fetchAndDecompress(urlObj?.url);
  
}

async function fetchAndDecompress(url: string): Promise<(PageSpeedInsights | null | undefined)[]> {
  const compressedFetch = await fetch(url ?? '');
  if (!compressedFetch.ok) {
    return [null, null];
  }

  const compressedStream = compressedFetch.body;
  if (!compressedStream) {
    return [null, null];
  }
  const decompressionStream = new DecompressionStream('gzip');
  const decompressedStream = compressedStream.pipeThrough(decompressionStream);
  return JSON.parse(
    await new Response(decompressedStream).text(),
  );

}
