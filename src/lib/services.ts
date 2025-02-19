'use cache';
import { unstable_cacheLife as cacheLife } from 'next/cache'

import * as Sentry from "@sentry/nextjs";
import { CruxHistoryReport, cruxReportSchema, pageSpeedInsightsSchema } from "./schema";

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

    const response = await fetch(baseurl.toString());
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const a = pageSpeedInsightsSchema.parse(data);
    return a;
  } catch (error) {
    Sentry.captureException(error);
    console.error(error);
    return null;
  }
}