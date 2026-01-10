// import * as Sentry from "@sentry/nextjs";
import { CruxReport, cruxReportSchema } from '@/lib/schema';
import * as Sentry from '@sentry/nextjs';

export { getHistoricalCruxData } from './historicalCruxData.services';

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
