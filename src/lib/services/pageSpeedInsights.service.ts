"use server"
import * as Sentry from '@sentry/nextjs';
import { PageSpeedInsightsTable } from '@/db/schema';
import { db } from '@/db';
import { PageSpeedInsights } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';
import {waitUntil} from '@vercel/functions'


type formFactor = 'DESKTOP' | 'MOBILE';

export async function getPageSpeedDataURl(testURL: string, formFactor: formFactor) {
  const baseurl = new URL(
    'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
  );
  baseurl.searchParams.append('url', encodeURI(testURL));
  ['ACCESSIBILITY', 'BEST_PRACTICES', 'PERFORMANCE', 'PWA', 'SEO'].forEach(
    (category) => baseurl.searchParams.append('category', category),
  );
  baseurl.searchParams.append('key', process.env.PAGESPEED_INSIGHTS_API ?? '');
  if (formFactor) {
    baseurl.searchParams.append('strategy', formFactor);
  }
  return baseurl.toString();
}

export const getSavedPageSpeedData = async (url: string) => {
  try {
    const result = await db.query.PageSpeedInsightsTable.findFirst({
      columns: { status: true,  data: true },
      where: (PageSpeedInsightsTable, { eq, and, gt }) =>
        and(
          eq(PageSpeedInsightsTable.url, url),
          gt(
            PageSpeedInsightsTable.date,
            new Date(Date.now() - 21_600_000),
          ),
        ),
    });
    debugger;
    if (typeof result?.data === 'string') {
      result.data = result.data;
      console.log('result', result, url)
    }
    return result;
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
};

export const requestPageSpeedData = async (
  testURL: string | undefined,
): Promise<string | null> => {
  try {
    if (!testURL) {
      return null;
    }
    const result = await savePageSpeedData(testURL);
    waitUntil((async () => {
      console.log('starting api request')
      console.log('data loaded', result)
    })())
    return result.publicId;
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
};

function createRequestDate() {
  // round current time to nearest 15 min 
  const date = new Date(Date.now());
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return date;
}

type ApiResponse = {
  publicId: string,
  url: string,
  status: 'pending' | 'completed' | 'error',
  data: [PageSpeedInsights | null | undefined][] | Record<string, unknown>
}

async function savePageSpeedData(url: string): Promise<ApiResponse> {
  const date = createRequestDate();
  try {
    // await insertPendingMeasurement(url, date);
    const requestUrl = new URL('https://web-perf-report-cf.to-email-max.workers.dev');
    requestUrl.searchParams.append('url', (url));
    requestUrl.searchParams.append('key', process.env.PAGESPEED_INSIGHTS_API ?? '');
    const x = await fetch(requestUrl.toString());
    if (!x.ok) {
      throw new Error(`Failed to fetch: ${x.status}`);
    }
    const response = (await x.json()) as ApiResponse;
    return response;
  } catch (error) {
    console.log('error', error);
    await handleMeasurementFailure(error, url, date);
    throw error;
  }
}

async function handleMeasurementFailure(
  error: unknown,
  url: string,
  date: Date,
) {
  Sentry.captureException(error);

  try {
    await db
      .delete(PageSpeedInsightsTable)
      .where(
        and(
          eq(PageSpeedInsightsTable.url, url),
          eq(PageSpeedInsightsTable.status, 'PENDING'),
          eq(PageSpeedInsightsTable.date, date),
        ),
      )
      .execute();
  } catch (dbError) {
    Sentry.captureException(dbError);
  }
}
