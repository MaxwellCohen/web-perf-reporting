import type { PageSpeedInsights } from "@/lib/schema";

/**
 * Canonical PageSpeed Insights row types for the dashboard feature.
 * Prefer importing from here or `@/lib/schema` — both align on Zod-inferred `PageSpeedInsights`.
 */

export type PageSpeedDashboardItem = {
  item: PageSpeedInsights;
  label: string;
};

/** Alias used by the dashboard store for labeled PSI report slices. */
export type InsightsContextItem = PageSpeedDashboardItem;
