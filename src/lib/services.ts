// import * as Sentry from "@sentry/nextjs";
import { db } from '@/db';
import {
  CruxHistoryReportSchema,
  CruxReport,
  cruxReportSchema,
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
        cache: 'force-cache'
      },
    );
    if (!request.ok) {
      throw new Error(
        'Failed to fetch current CRUX data: ' + request.statusText,
      );
    }
    const data = await request.json() as CruxReport;
    const parsedData = cruxReportSchema.parse(data);
    return parsedData;
  } catch (error) {
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
            const lastDate = data.record.collectionPeriod.lastDate
            const date = formatDate(data.record.collectionPeriod.lastDate);
            return {
              id: `${url ?? ''}-${origin ?? ''}-${formFactor}-${date}`,
              url: url ?? '',
              origin: origin ?? '',
              formFactor: formFactor ?? '',
              date: date,
              date2: new Date(lastDate.year, lastDate.month, lastDate.day),
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