import { type NextRequest } from 'next/server';
import {
  fetchWorkerJobEnvelopeByUrl,
  type WorkerJobEnvelope,
} from '@/lib/page-speed-insights/pageSpeedWorkerClient';

export async function POST(request: NextRequest) {
  try {
    const { testURL } = await request.json();
    if (!testURL) {
      return new Response('No testURL provided', { status: 400 });
    }
    let url: URL;
    try {
      url = new URL(testURL);
    } catch {
      return new Response('Invalid URL provided', { status: 400 });
    }
    if (!url.origin) {
      return new Response('Invalid URL provided', { status: 400 });
    }

    const req = await fetchWorkerJobEnvelopeByUrl(testURL);
    if (!req.ok) {
      return new Response('Error fetching data', { status: req.status });
    }
    const data = (await req.json()) as WorkerJobEnvelope;

    if (!data) {
      return new Response('Data is not yet ready no data', { status: 404 });
    }
    if (data.status.toLowerCase() !== 'completed') {
      return new Response(`Data is not yet ready! ${data.status}`, { status: 404 });
    }
    if (data.data) {
      return new Response(data.data, {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(data.data, { status: 500 });
  } catch (error) {
    console.error('Error fetching PageSpeed Insights data:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
