// import * as Sentry from "@sentry/nextjs";
import { db } from '@/db';
import {
  CruxHistoryReportSchema,
  cruxReportSchema,
  PageSpeedInsights,
  pageSpeedInsightsSchema,
} from './schema';
import { convertCruxHistoryToReports, formatDate } from './utils';
import * as Sentry from '@sentry/nextjs';
import { historicalMetrics as historicalMetrics } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export type formFactor =
  | 'PHONE'
  | 'TABLET'
  | 'DESKTOP'
  | 'ALL_FORM_FACTORS'
  | undefined;

export const getCurrentCruxData = async ({
  url,
  origin,
  formFactor,
}: {
  url?: string;
  origin?: string;
  formFactor: formFactor;
}) => {
  try {
    const request = await fetch(
      `https://content-chromeuxreport.googleapis.com/v1/records:queryRecord?alt=json&key=${process.env.PAGESPEED_INSIGHTS_API}`,
      {
        body: JSON.stringify({ url, formFactor, origin }),
        method: 'POST',
      },
    );
    if (!request.ok) {
      throw new Error(
        'Failed to fetch current CRUX data: ' + request.statusText,
      );
    }
    const data = await request.json();
    const parsedData = cruxReportSchema.parse(data);
    return parsedData;
  } catch (error) {
    console.log(JSON.stringify({ url, formFactor, origin }));
    console.log(error);
    Sentry.captureException(error);
    return null;
  }
};

export const getHistoricalCruxData = async ({
  url,
  origin,
  formFactor,
}: {
  url?: string;
  origin?: string;
  formFactor?: formFactor;
}) => {
  try {
    const request = await fetch(
      `https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?key=${process.env.PAGESPEED_INSIGHTS_API}`,
      {
        body: JSON.stringify({ url, formFactor, origin }),
        method: 'POST',
      },
    );
    if (!request.ok) {
      return null;
    }
    const data = await request.json();
    const parseData = CruxHistoryReportSchema.parse(data);
    const reports = convertCruxHistoryToReports(parseData);

    if (reports.length) {
      await db.insert(historicalMetrics)
        .values(
          reports.map((data) => {
            const date = formatDate(data.record.collectionPeriod.lastDate);
            return {
              id: `${url ?? ''}-${origin ?? ''}-${formFactor}-${date}`,
              url: url ?? '',
              origin: origin ?? '',
              formFactor: formFactor ?? '',
              date: date,
              data,
            };
          }),
        )
        .execute()
        .catch(() => {});
    }
    const dbData = await db
      .select({ data: historicalMetrics.data })
      .from(historicalMetrics)
      .where(
        and(
          eq(historicalMetrics.url, url ?? ''),
          eq(historicalMetrics.origin, origin ?? ''),
          eq(historicalMetrics.formFactor, formFactor ?? ''),
        ),
      )
      .orderBy(desc(historicalMetrics.id));

    return dbData.map(({ data }) => data);
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
};

const records: Record<string, PageSpeedInsights> = {};

export const requestPageSpeedData = async (
  testURL: string,
  formFactor: formFactor,
) => {
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
    console.log(baseurl.toString());
    if (records[baseurl.toString()]) {
      return records[baseurl.toString()];
    }

    const response = await fetch(baseurl.toString(), {});
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const a = pageSpeedInsightsSchema.parse(data);
    records[baseurl.toString()] = a;
    return a;
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
};
