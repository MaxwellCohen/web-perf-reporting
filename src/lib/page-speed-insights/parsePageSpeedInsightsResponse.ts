import type { PageSpeedInsights } from "@/lib/schema";

export type PageSpeedInsightsArray = (PageSpeedInsights | null | undefined)[];

/**
 * Parses JSON text from PageSpeed Insights API responses (see `pageSpeedInsightsApiClient`).
 * Returns [] on parse failure (caller may log).
 */
export function parsePageSpeedInsightsArrayFromText(text: string): PageSpeedInsightsArray {
  try {
    const parsedData = JSON.parse(text) as unknown;
    if (Array.isArray(parsedData)) {
      return parsedData as PageSpeedInsightsArray;
    }
  } catch (error) {
    console.error("Error parsing PageSpeed Insights data:", error);
  }
  return [];
}
