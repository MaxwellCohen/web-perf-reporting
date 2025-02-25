import * as Sentry from '@sentry/nextjs';
import { PageSpeedInsightsTable } from '@/db/schema';
import { db } from '@/db';
import { PageSpeedInsights } from '../schema';

export const requestPageSpeedData = async (
  testURL: string,
  formFactor: 'DESKTOP' | 'MOBILE',
): Promise<PageSpeedInsights | null> => {
  try {
    const baseurl = new URL(
      'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
    );
    baseurl.searchParams.append('url', encodeURI(testURL));
    baseurl.searchParams.append('category', 'ACCESSIBILITY');
    baseurl.searchParams.append('category', 'BEST_PRACTICES');
    baseurl.searchParams.append('category', 'PERFORMANCE');
    baseurl.searchParams.append('category', 'PWA');
    baseurl.searchParams.append('category', 'SEO');
    baseurl.searchParams.append(
      'key',
      process.env.PAGESPEED_INSIGHTS_API ?? '',
    );
    if (formFactor) {
      baseurl.searchParams.append('strategy', formFactor);
    }

    const result = await db.query.PageSpeedInsightsTable.findFirst({
      where: (PageSpeedInsightsTable, { eq, and, gt }) => 
        and(
          eq(PageSpeedInsightsTable.url, baseurl.toString()),
          gt(PageSpeedInsightsTable.date, new Date(Date.now() - 6 * 60 * 60 * 1000))
        )
    })
    if (result) {
      console.log('using db')

      return result.data;
    }

    const response = await fetch(baseurl.toString(), {});
    if (!response.ok) {
      return null;
    }
    const data = await response.json() as PageSpeedInsights
    if (data) {
      db.insert(PageSpeedInsightsTable).values({
        url: baseurl.toString(),
        date: new Date(data.analysisUTCTimestamp),
        data: data
      }).execute();
    }
   
    return data;
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
};