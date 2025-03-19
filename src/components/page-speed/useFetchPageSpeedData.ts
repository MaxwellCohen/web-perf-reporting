import { PageSpeedInsights } from '@/lib/schema';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';

export function useFetchPageSpeedData(
  formFactor: string,
  defaultData?: PageSpeedInsights,
) {
  const searchParams = useSearchParams();
  const url = encodeURI(searchParams?.get('url') ?? '');
  const { data } = useSWR(
    [`/api/pagespeed`, url, formFactor],
    () => fetcher(url, formFactor),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      isPaused: () => !defaultData,
    },
  );

  if (defaultData) {
    return defaultData;
  }
  return data;
}

async function fetcher(url: string, formFactor: string) {
  const res = await fetch('/api/pagespeed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      testURL: url,
      formFactor: formFactor,
    }),
  });

  // If the status code is not in the range 200-299,
  // we still try to parse and throw it.
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }

  return res.json() as Promise<PageSpeedInsights>;
}
