/**
 * PageSpeed Insights API client
 */

import type { FormFactor, PageSpeedApiResponse } from "../types";
import { PAGESPEED_API_BASE_URL, PAGESPEED_CATEGORIES } from "../constants";

/**
 * Builds the PageSpeed Insights API URL with query parameters
 */
export function buildPageSpeedApiUrl(
  testUrl: string,
  formFactor: FormFactor,
  apiKey: string
): string {
  const url = new URL(PAGESPEED_API_BASE_URL);
  url.searchParams.append("url", encodeURI(testUrl));
  
  PAGESPEED_CATEGORIES.forEach((category) => {
    url.searchParams.append("category", category);
  });
  
  url.searchParams.append("key", apiKey);
  url.searchParams.append("strategy", formFactor);
  
  return url.toString();
}

/**
 * Fetches PageSpeed Insights data for a given URL and form factor
 */
export async function fetchPageSpeedData(
  requestUrl: string,
  formFactor: FormFactor,
  apiKey: string
): Promise<PageSpeedApiResponse> {
  const url = buildPageSpeedApiUrl(requestUrl, formFactor, apiKey);
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`PageSpeed API error (${response.status}):`, errorText);
    return { error: errorText };
  }
  
  return response.json();
}
