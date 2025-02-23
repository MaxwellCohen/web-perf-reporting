import * as Sentry from '@sentry/nextjs';
import { PageSpeedInsights } from '../schema';
import { formFactor } from '../services';
import {unstable_cache as cache } from 'next/cache'
const records: Record<string, PageSpeedInsights> = {};

export const requestPageSpeedData = cache(async (
  testURL: string,
  formFactor: formFactor,
): Promise<PageSpeedInsights | null> => {
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
    const data = await response.json() as PageSpeedInsights;
    const a = data;
    records[baseurl.toString()] = a;
    return a;
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
},[], {
  revalidate: 60 * 60 * 24
} );