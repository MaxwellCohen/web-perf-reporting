import { getSavedPageSpeedData } from '@/lib/services/pageSpeedInsights.service';
import { type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { testURL } = await request.json();
  const url = new URL(testURL);
  if (!url.origin) {
    return new Response('Invalid URL provided', { status: 400 });
  }
  if (!testURL) {
    return new Response('No testURL provided', { status: 400 });
  }
  const data = await getSavedPageSpeedData(
    testURL,
  );

  if (!data) {
    return new Response('No data found', { status: 404 });
  }
  if (data.status !== 'COMPLETED') {
    return new Response('Data is not yet ready', { status: 404 });
  }
  if (data.jsonUrl) {
    return new Response(JSON.stringify({ url: data.jsonUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response('Everything failed', { status: 404 });
}
