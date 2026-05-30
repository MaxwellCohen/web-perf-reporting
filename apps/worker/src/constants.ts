/**
 * Application constants
 */

export const PAGESPEED_CATEGORIES = [
  "ACCESSIBILITY",
  "BEST_PRACTICES",
  "PERFORMANCE",
  "SEO",
] as const;

export const PAGESPEED_API_BASE_URL =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export const WORKER_ROUTES = {
  ROOT: "/",
  DEBUG_LIST: "/debug/list",
  DELETE_OLD: "/delete-old",
  GET_BY_PUBLIC_ID: "/get-by-id",
} as const;

export const CACHE_DURATION_MS = 3_600_000; // 1 hour

export const RESULTS_EXPIRY_DAYS = 3;

export const RESULTS_BUCKET_PREFIX = "results/";
