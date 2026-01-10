import { db } from '@/db';
import { CruxHistoryReportSchema } from '@/lib/schema';
import { convertCruxHistoryToReports, formatDate } from '@/lib/utils';
import * as Sentry from '@sentry/nextjs';
import { historicalMetrics } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { formFactor } from '@/lib/services';

export const getHistoricalCruxData = async ({
  url,
  origin,
  formFactor,
}: {
  url?: string;
  origin?: string;
  formFactor?: formFactor;
}) => {
  // Validate that at least one parameter is provided
  if (!url && !origin) {
    throw new Error('Either URL or origin must be provided');
  }

  try {
    const API_KEY = process.env.PAGESPEED_INSIGHTS_API;
    if (!API_KEY) {
      throw new Error('PAGESPEED_INSIGHTS_API environment variable is not set');
    }

    const response = await fetch(
      `https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?key=${API_KEY}`,
      {
        body: JSON.stringify({ 
          url: url || undefined, 
          formFactor: formFactor || undefined, 
          origin: origin || undefined, 
          collectionPeriodCount: 40
        }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`API request failed: ${response.status} ${response.statusText}${
        errorData ? ` - ${JSON.stringify(errorData)}` : ''
      }`);
    }

    const data = await response.json();
    const parseData = CruxHistoryReportSchema.parse(data);
    const reports = convertCruxHistoryToReports(parseData);

    if (reports.length) {
      await db.insert(historicalMetrics)
        .values(
          reports.map((data) => {
            const lastDate = data.record.collectionPeriod.lastDate;
            const date = formatDate(lastDate);
            const id = `${url ?? ''}-${origin ?? ''}-${formFactor ?? ''}-${date}`;
            
            return {
              id,
              url: url ?? '',
              origin: origin ?? '',
              formFactor: formFactor ?? '',
              date,
              date2: new Date(lastDate.year, lastDate.month - 1, lastDate.day), // Month is 0-based
              data,
            };
          }),
        )
        .onConflictDoNothing() // Handle duplicate entries gracefully
        .execute();
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
      .orderBy(asc(historicalMetrics.date2));

    return dbData.map(({ data }) => data);
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
}; 