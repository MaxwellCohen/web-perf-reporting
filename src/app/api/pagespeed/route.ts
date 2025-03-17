import { getSavedPageSpeedData } from '@/lib/services/pageSpeedInsights.service';
import { type NextRequest } from 'next/server'
 
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const testURL = searchParams.get('testURL');
  const formFactor = searchParams.get('formFactor');
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

