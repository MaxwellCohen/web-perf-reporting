import { type NextRequest } from 'next/server';
import {
  fetchWorkerJobEnvelopeByPublicId,
  type WorkerJobEnvelope,
} from '@/lib/page-speed-insights/pageSpeedWorkerClient';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> },
) {
  try {
    const { publicId } = await params;

    if (!publicId) {
      return new Response('No publicId provided', { status: 400 });
    }

    const req = await fetchWorkerJobEnvelopeByPublicId(publicId);

    if (!req.ok) {
      return new Response(`Error fetching data!`, { status: 500 });
    }

    const data = (await req.json()) as WorkerJobEnvelope;
    if (!data) {
      return new Response('Data is not yet ready no data!!', { status: 404 });
    }

    if (data.status.toLowerCase() === 'failed') {
      return new Response(`Failed to fetch data! ${data.status}`, { status: 500 });
    }

    if (data.status.toLowerCase() !== 'completed') {
      return new Response(JSON.stringify(data), { status: 404 });
    }

    if (data.data) {
      return new Response(JSON.stringify(data.data), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    console.error('Error fetching PageSpeed Insights data:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
