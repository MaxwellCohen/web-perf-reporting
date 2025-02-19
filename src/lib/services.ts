import * as Sentry from "@sentry/nextjs";
import { CruxHistoryReport, cruxReportSchema } from "./schema";

export type formFactor = 'PHONE' | 'TABLET' | 'DESKTOP' | 'ALL_FORM_FACTORS';

export const getCurrentCruxData = async (testURL: string, formFactor: formFactor) => {
  try {
    const request = await fetch(`https://content-chromeuxreport.googleapis.com/v1/records:queryRecord?alt=json&key=${process.env.PAGESPEED_INSIGHTS_API}`, {
      "body": JSON.stringify({ "origin": testURL, "formFactor": formFactor }),
      "method": "POST"
    });
    if (!request.ok) {
      return null;
    }
    const data = await request.json();
    return cruxReportSchema.parse(data);
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
}

export const getHistoricalCruxData = async (testURL: string, formFactor: formFactor) => {
  try {
    const request = await fetch(`https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?key=${process.env.PAGESPEED_INSIGHTS_API}`, {
      "body": JSON.stringify({ "origin": testURL, "formFactor": formFactor }),
      "method": "POST"
    });
    if (!request.ok) {
      return null;
    }
    const data = await request.json();
    return CruxHistoryReport.parse(data);
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
}

const pageSpeedURL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

const makePageSpeedURL = (testURL: string) => {
  return `${pageSpeedURL}?url=${encodeURIComponent(testURL)}&key=${process.env.PAGESPEED_INSIGHTS_API}`
}

export const requestPageSpeedData = async (testURL: string) => {
  try {
    const response = await fetch(makePageSpeedURL(testURL))
    if (!response.ok) {
      return null;
    }
    const data = await response.json()
    return data
  } catch (error) {
    return null
  }
}