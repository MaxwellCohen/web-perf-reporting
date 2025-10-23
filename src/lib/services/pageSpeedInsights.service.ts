"use server"
import * as Sentry from '@sentry/nextjs';
import { PageSpeedInsightsTable } from '@/db/schema';
import { db } from '@/db';
import { PageSpeedInsights } from '../schema';
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
            new Date(Date.now() - 6 * 60 * 60 * 1000),
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
): Promise<(PageSpeedInsights | null | undefined)[]> => {
  try {
    if (!testURL) {
      return [null, null];
    }
    // const savedData = await getSavedPageSpeedData(testURL);
    // if (savedData?.status === 'COMPLETED' && Array.isArray(savedData.data)) {
    //   return savedData.data ?? [null, null];
    // }
    const p = savePageSpeedData(testURL);
    waitUntil((async () => {
      console.log('starting api request')
      const pageSpeedSaveProcess = await p;
      console.log('data loaded', pageSpeedSaveProcess)
    })())
    return [null, null];
  } catch (error) {
    Sentry.captureException(error);
    return [null, null];
  }
};

function createRequestDate() {
  // round current time to nearest 15 min 
  const date = new Date(Date.now());
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return date;
}

async function savePageSpeedData(url: string) {
  const date = createRequestDate();
  try {
    // await insertPendingMeasurement(url, date);
    const requestUrl = new URL('https://web-perf-report-cf.to-email-max.workers.dev');
    requestUrl.searchParams.append('url', (url));
    requestUrl.searchParams.append('key', process.env.PAGESPEED_INSIGHTS_API ?? '');
    await fetch(requestUrl.toString());
    return [null, null];
    // const data =  Promise.all([
    //   fetchPageSpeedData(url, 'MOBILE'),
    //   fetchPageSpeedData(url, 'DESKTOP'),
    // ]);
    // console.log('data fetched', data)
    // await handleMeasurementSuccess(url, date, data);
    // return data;
  } catch (error) {
    console.log('error', error);
    await handleMeasurementFailure(error, url, date);
    return [null, null];
  }
}

// async function insertPendingMeasurement(url: string, date: Date) {
//   await db
//     .insert(PageSpeedInsightsTable)
//     .values({ url, date, status: 'PENDING' })
//     .onConflictDoNothing()
//     .execute();
// }

// async function fetchPageSpeedData(url: string, formFactor: formFactor) {
//   const pageSpeedDataUrl = await getPageSpeedDataURl(url, formFactor);
//   const response = await fetch(pageSpeedDataUrl);
//   if (!response.ok) {
//     return null;
//   }
//   return response.json() as Promise<PageSpeedInsights>;
// }

// async function handleMeasurementSuccess(
//   url: string,
//   date: Date,
//   data: (PageSpeedInsights | null | null)[],
// ) {
//   await db
//     .update(PageSpeedInsightsTable)
//     .set({
//       url,
//       date,
//       status: 'COMPLETED',
//       data: data,
//     })
//     .where(
//       and(
//         eq(PageSpeedInsightsTable.url, url),
//         eq(PageSpeedInsightsTable.status, 'PENDING'),
//         eq(PageSpeedInsightsTable.date, date),
//       ),
//     )
//     .execute();
// }

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
