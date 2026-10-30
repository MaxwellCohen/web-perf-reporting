export const PAGESPEED_CATEGORIES = [
  "ACCESSIBILITY",
  "AGENTIC_BROWSING",
  "BEST_PRACTICES",
  "PERFORMANCE",
  "SEO",
] as const;

export const PAGESPEED_API_BASE_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export const CACHE_DURATION_MS = 3_600_000;
export const RESULTS_EXPIRY_DAYS = 3;
export const RESULTS_BUCKET_PREFIX = "results/";

export type PageSpeedStrategy = "mobile" | "desktop";

export function strategyToFormFactor(strategy: PageSpeedStrategy): "MOBILE" | "DESKTOP" {
  return strategy === "mobile" ? "MOBILE" : "DESKTOP";
}
