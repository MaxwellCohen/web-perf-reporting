import * as Sentry from '@sentry/nextjs';
import { PageSpeedInsightsTable } from '@/db/schema';
import { db } from '@/db';
import { PageSpeedInsights } from '../schema';
import { waitUntil } from '@vercel/functions';
import { and, eq } from 'drizzle-orm';

type formFactor = 'DESKTOP' | 'MOBILE';

export function getPageSpeedDataURl(testURL: string, formFactor: formFactor) {
  const baseurl = new URL(
    'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
  );
  baseurl.searchParams.append('url', encodeURI(testURL));
  baseurl.searchParams.append('category', 'ACCESSIBILITY');
  baseurl.searchParams.append('category', 'BEST_PRACTICES');
  baseurl.searchParams.append('category', 'PERFORMANCE');
  baseurl.searchParams.append('category', 'PWA');
  baseurl.searchParams.append('category', 'SEO');
  baseurl.searchParams.append('key', process.env.PAGESPEED_INSIGHTS_API ?? '');
  if (formFactor) {
    baseurl.searchParams.append('strategy', formFactor);
  }

  return baseurl.toString();
}

export const getSavedPageSpeedData = async (
  testURL: string,
  formFactor: formFactor,
) => {
  try {
    const pageSpeedDataUrl = getPageSpeedDataURl(testURL, formFactor);
    const result = await db.query.PageSpeedInsightsTable.findFirst({
      columns: { data: true, status: true },
      where: (PageSpeedInsightsTable, { eq, and, gt }) =>
        and(
          eq(PageSpeedInsightsTable.url, pageSpeedDataUrl),
          gt(
            PageSpeedInsightsTable.date,
            new Date(Date.now() - 6 * 60 * 60 * 1000),
          ),
        ),
    });
    console.log(result);
    return result;
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
};

export const requestPageSpeedData = async (
  testURL: string | undefined,
  formFactor: formFactor,
): Promise<PageSpeedInsights | null> => {
  try {
    if (!testURL) {
      return null;
    }
    const savedData = (await getSavedPageSpeedData(testURL, formFactor))?.data;
    if (savedData) {
      return savedData;
    }

    waitUntil(savePageSpeedData(testURL, formFactor));
    return null;
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
};

async function savePageSpeedData(testURL: string, formFactor: formFactor) {
  try {
    const pageSpeedDataUrl = getPageSpeedDataURl(testURL, formFactor);
    const date = new Date(Date.now());
    await db
      .insert(PageSpeedInsightsTable)
      .values({
        url: pageSpeedDataUrl,
        date,
        status: 'PENDING',
      })
      .onConflictDoNothing()
      .execute();
      console.log('saving data!!!');
    const response = await fetch(pageSpeedDataUrl);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as PageSpeedInsights;
    if (!data) {
      return;
    }
    console.log(data);
    await db
      .update(PageSpeedInsightsTable).set({
        url: pageSpeedDataUrl,
        date,
        data: data,
        status: 'COMPLETED',
      }).where(and(eq(PageSpeedInsightsTable.url, pageSpeedDataUrl), eq(PageSpeedInsightsTable.status, 'PENDING'), eq(PageSpeedInsightsTable.date, date)))
      
      console.log('done saving data!!!');
  } catch (error) {
    console.log(error);
    Sentry.captureException(error);
  }
}
