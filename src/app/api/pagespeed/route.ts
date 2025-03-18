import { getSavedPageSpeedData } from '@/lib/services/pageSpeedInsights.service';
import { type NextRequest } from 'next/server'
 
export async function POST(request: NextRequest) {
  const { testURL, formFactor } = await request.json()
  const url = new URL(testURL);
  if (!url.origin) {
    return  new Response('Invalid URL provided', { status: 400 });
  }
  if (!testURL) {
    return  new Response('No testURL provided', { status: 400 });
  }
  if (!formFactor || !['DESKTOP', 'MOBILE'].includes(formFactor)) {
    return  new Response('No formFactor provided', { status: 400 });
  }
const data = await getSavedPageSpeedData(testURL, formFactor as 'DESKTOP' | 'MOBILE');
 if (!data) {
   return  new Response('No data found', { status: 404 });
 }  
 return Response.json(data);  
}

