import { type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {

    const { testURL } = await request.json();
    const url = new URL(testURL);
    if (!url.origin) {
      return new Response('Invalid URL provided', { status: 400 });
    }
    if (!testURL) {
      return new Response('No testURL provided', { status: 400 });
    }
    console.log('requesting data for', testURL)
    // const data = await getSavedPageSpeedData(
      //   testURL,
      // );
      const requestUrl = new URL('https://web-perf-report-cf.to-email-max.workers.dev');
      requestUrl.searchParams.append('url', (testURL));
      const req = await fetch(requestUrl);
      if (!req.ok) {
        return new Response('Error fetching data', { status: req.status });
      }
      const data = await req.json() as { status: string, data?: string };
      
      console.log('requesting data for', data)
      
      if (!data) {
        return new Response('Data is not yet ready no data', { status: 404 });
      }
      if (data.status.toLowerCase() !== 'completed') {
        return new Response(`Data is not yet ready! ${data.status}`, { status: 404 });
      }
      if (data.data) {
        return new Response(JSON.stringify(data.data), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(data.data, { status: 500 });
    } catch (error) {
      console.error('Error fetching PageSpeed Insights data:', error);
      return new Response('Internal server error', { status: 500 });
    }
  }
    