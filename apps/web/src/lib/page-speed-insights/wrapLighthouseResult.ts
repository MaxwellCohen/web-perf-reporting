import type { PageSpeedInsights } from "@/lib/schema";

/**
 * Wraps a bare Lighthouse result in the PSI envelope the dashboard expects.
 * The cast is deliberate: a raw Lighthouse JSON lacks the PSI-only fields
 * (loadingExperience, analysisUTCTimestamp, ...), which every consumer reads optionally.
 */
export function wrapLighthouseResult(lighthouseResult: unknown): PageSpeedInsights {
  return { lighthouseResult } as unknown as PageSpeedInsights;
}
