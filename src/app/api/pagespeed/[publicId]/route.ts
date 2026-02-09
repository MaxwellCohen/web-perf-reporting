import { type NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;
    
    if (!publicId) {
      return new Response('No publicId provided', { status: 400 });
    }

    const requestUrl = new URL('https://web-perf-report-cf.to-email-max.workers.dev/get-by-id');
    requestUrl.searchParams.append('id', publicId);
    const req = await fetch(requestUrl);
    
    if (!req.ok) {
      return new Response(`Error fetching data!`, { status: 500 });
    }
    
    const data = await req.json() as { status: string, data?: string };
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
