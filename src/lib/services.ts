import { CruxReport, cruxReportSchema } from '@/lib/schema';
import * as Sentry from '@sentry/nextjs';

export { getHistoricalCruxData } from '@/lib/historicalCruxData.services';

export type formFactor =
  | 'PHONE'
  | 'TABLET'
  | 'DESKTOP'
  | 'ALL_FORM_FACTORS'
  | undefined;

const CRUX_REVALIDATE_SECONDS = 86_400;

export const getCurrentCruxData = async ({
  url,
  origin,
  formFactor,
}: {
  url?: string;
  origin?: string;
  formFactor: formFactor;
}) => {
  const apiKey = process.env.PAGESPEED_INSIGHTS_API;
  if (!apiKey) {
    const err = new Error(
      'PAGESPEED_INSIGHTS_API environment variable is not set',
    );
    Sentry.captureException(err);
    return null;
  }

  try {
    const request = await fetch(
      `https://content-chromeuxreport.googleapis.com/v1/records:queryRecord?alt=json&key=${apiKey}`,
      {
        body: JSON.stringify({ url, formFactor, origin }),
        method: 'POST',
        next: { revalidate: CRUX_REVALIDATE_SECONDS },
      },
    );
    if (!request.ok) {
      throw new Error(
        'Failed to fetch current CRUX data: ' + request.statusText,
      );
    }
    const data = (await request.json()) as CruxReport;
    const parsedData = cruxReportSchema.parse(data);
    return parsedData;
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
};
