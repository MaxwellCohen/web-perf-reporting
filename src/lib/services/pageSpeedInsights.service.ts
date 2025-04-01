import * as Sentry from '@sentry/nextjs';
import { PageSpeedInsightsTable } from '@/db/schema';
import { db } from '@/db';
import { PageSpeedInsights } from '../schema';
import { and, eq } from 'drizzle-orm';
import { UTApi, UTFile } from 'uploadthing/server';
import { stringify, parse } from 'zipson';

export async function uploadJSONData(
  url: string,
  resultArray: (PageSpeedInsights | null)[],
) {
  // // Convert object to string and then to Uint8Array
  // const jsonString = JSON.stringify(resultArray);
  // const bytes = new TextEncoder().encode(jsonString);

  // // Create compressed stream
  // const cs = new CompressionStream('gzip');
  // const writer = cs.writable.getWriter();
  // const compressed = cs.readable;

  // // Write and close
  // writer.write(bytes);
  // writer.close();

  // Convert stream to blob
  const blob = await new Response(stringify(resultArray)).blob();

  const utapi = new UTApi();
  const file = new UTFile([blob], `${url.replace(/[^a-zA-Z]/g, '')}.gz`, {
    customId: Math.random().toString(),
  });
  const uploadResponse = await utapi.uploadFiles([file]);
  return uploadResponse;
}

type formFactor = 'DESKTOP' | 'MOBILE';

export function getPageSpeedDataURl(testURL: string, formFactor: formFactor) {
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
    console.log(result?.status);
    if (typeof result?.data === 'string') {
      result.data = parse(result.data);
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
    const savedData = await getSavedPageSpeedData(testURL);
    if (savedData?.status === 'COMPLETED' && Array.isArray(savedData.data)) {
      return savedData.data ?? [null, null];
    }
    const pageSpeedSaveProcess = await savePageSpeedData(testURL);
    console.log('data loaded', pageSpeedSaveProcess)
    return pageSpeedSaveProcess;
  } catch (error) {
    Sentry.captureException(error);
    return [null, null];
  }
};

async function savePageSpeedData(url: string) {
  const date = new Date(Date.now());
  try {
    await insertPendingMeasurement(url, date);

    const data = await Promise.all([
      fetchPageSpeedData(url, 'MOBILE'),
      fetchPageSpeedData(url, 'DESKTOP'),
    ]);
    console.log('data fetched', data)
    // const uploadResponse = await uploadJSONData(url, data);
    await handleMeasurementSuccess(url, date, data);
    return data;
  } catch (error) {
    console.log('error', error);
    await handleMeasurementFailure(error, url, date);
    return [null, null];
  }
}

// New helper functions
async function insertPendingMeasurement(url: string, date: Date) {
  await db
    .insert(PageSpeedInsightsTable)
    .values({ url, date, status: 'PENDING' })
    .onConflictDoNothing()
    .execute();
}

async function fetchPageSpeedData(url: string, formFactor: formFactor) {
  const pageSpeedDataUrl = getPageSpeedDataURl(url, formFactor);
  const response = await fetch(pageSpeedDataUrl);
  if (!response.ok) {
    return null;
  }
  return response.json() as Promise<PageSpeedInsights>;
}

async function handleMeasurementSuccess(
  url: string,
  date: Date,
  data: (PageSpeedInsights | null | null)[],
) {
  await db
    .update(PageSpeedInsightsTable)
    .set({
      url,
      date,
      status: 'COMPLETED',
      data: stringify(data),
    })
    .where(
      and(
        eq(PageSpeedInsightsTable.url, url),
        eq(PageSpeedInsightsTable.status, 'PENDING'),
        eq(PageSpeedInsightsTable.date, date),
      ),
    )
    .execute();
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
