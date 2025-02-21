

// import * as Sentry from "@sentry/nextjs";
import { CruxHistoryReportSchema, cruxReportSchema, PageSpeedInsights, pageSpeedInsightsSchema } from "./schema";
import { formatCruxHistoryReport, formatCruxReport } from "./utils";

export type formFactor = 'PHONE' | 'TABLET' | 'DESKTOP' | 'ALL_FORM_FACTORS';

export const getCurrentCruxData = async ({url, origin, formFactor}: {url?: string; origin?: string; formFactor: formFactor}) => {
  try {
    const request = await fetch(`https://content-chromeuxreport.googleapis.com/v1/records:queryRecord?alt=json&key=${process.env.PAGESPEED_INSIGHTS_API}`, {
      "body": JSON.stringify({  url, formFactor, origin }),
      "method": "POST"
    });
    if (!request.ok) {
      console.error('Failed to fetch current CRUX data:', request.statusText);
      return null;
    }
    const data = await request.json();
    return formatCruxReport(cruxReportSchema.parse(data));
  } catch (error) {
    console.log(error);
    // Sentry.captureException(error);
    return null;
  }
}

export const getHistoricalCruxData = async ({url, origin, formFactor}: {url?: string; origin?: string; formFactor: formFactor}) => {
  try {
    const request = await fetch(`https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?key=${process.env.PAGESPEED_INSIGHTS_API}`, {
      "body": JSON.stringify({  url, formFactor, origin }),
      "method": "POST"
    });
    if (!request.ok) {
      console.error('Failed to fetch historical CRUX data:', request.statusText);
      return null;
    }
    const data = await request.json();

    return formatCruxHistoryReport(CruxHistoryReportSchema.parse(data));
  } catch (error) {
    console.log(error);
    // Sentry.captureException(error);
    return null;
  }
}

const records: Record<string, PageSpeedInsights>= {

}

export const requestPageSpeedData = async (testURL: string, formFactor: formFactor) => {
  try {
    const baseurl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    baseurl.searchParams.append("url", testURL);
    baseurl.searchParams.append("category", "ACCESSIBILITY");
    baseurl.searchParams.append("category", "BEST_PRACTICES");
    baseurl.searchParams.append("category", "PERFORMANCE");
    baseurl.searchParams.append("category", "PWA");
    baseurl.searchParams.append("category", "SEO");
    baseurl.searchParams.append("key", process.env.PAGESPEED_INSIGHTS_API ?? '');
    baseurl.searchParams.append("strategy", formFactor);
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
    // Sentry.captureException(error);
    console.error(error);
    return null;
  }
}