import * as Sentry from '@sentry/nextjs';
import { PageSpeedInsightsTable } from '@/db/schema';
import { db } from '@/db';
import { PageSpeedInsights } from '../schema';

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
): Promise<PageSpeedInsights | null> => {
  try {
    const pageSpeedDataUrl = getPageSpeedDataURl(testURL, formFactor);
    const result = await db.query.PageSpeedInsightsTable.findFirst({
      columns: { data: true },
      where: (PageSpeedInsightsTable, { eq, and, gt }) =>
        and(
          eq(PageSpeedInsightsTable.url, pageSpeedDataUrl),
          gt(
            PageSpeedInsightsTable.date,
            new Date(Date.now() - 6 * 60 * 60 * 1000),
          ),
        ),
    });
    if (result?.data) {
      return result.data;
    }
    return null;
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
};

export const requestPageSpeedData = async (
  testURL: string,
  formFactor: formFactor,
): Promise<PageSpeedInsights | null> => {
  try {
    const pageSpeedDataUrl = getPageSpeedDataURl(testURL, formFactor);
    const response = await fetch(pageSpeedDataUrl);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as PageSpeedInsights;
    savePageSpeedData(pageSpeedDataUrl, data);
    return data;
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
};

async function savePageSpeedData(
  pageSpeedDataUrl: string,
  data?: PageSpeedInsights,
) {
  if (!data) {
    return null;
  }
  try {
    await db
      .insert(PageSpeedInsightsTable)
      .values({
        url: pageSpeedDataUrl,
        date: new Date(data.analysisUTCTimestamp),
        data: data,
      })
      .onConflictDoNothing()
      .execute();
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
}
