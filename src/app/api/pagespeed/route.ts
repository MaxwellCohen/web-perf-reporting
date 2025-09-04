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
    return new Response('Data is not yet ready', { status: 404 });
  }
  if (data.status !== 'COMPLETED') {
    return new Response('Data is not yet ready', { status: 404 });
  }
  if (data.data) {
    return new Response(JSON.stringify(data.data), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response('Everything failed', { status: 500 });
}
