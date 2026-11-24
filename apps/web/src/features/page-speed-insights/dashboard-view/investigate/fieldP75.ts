import { formatFieldPercentile } from "@/features/page-speed-insights/loading-experience/LoadingExperience";
import { formatMs } from "@/features/page-speed-insights/shared/format";
import type { PageSpeedInsights, UserPageLoadMetricV5 } from "@/lib/schema";

const FIELD_KEYS = {
  LCP: "LARGEST_CONTENTFUL_PAINT_MS",
  FCP: "FIRST_CONTENTFUL_PAINT_MS",
  CLS: "CUMULATIVE_LAYOUT_SHIFT_SCORE",
  INP: "INTERACTION_TO_NEXT_PAINT",
  TTFB: "EXPERIMENTAL_TIME_TO_FIRST_BYTE",
} as const;

export type FieldAcronym = keyof typeof FIELD_KEYS;

export type FieldP75 = {
  /** ms, or unitless for CLS. */
  value: number;
  display: string;
  scope: "url" | "origin";
};

/** Real-user p75 per metric; URL-level data first, origin as the fallback. */
export function fieldP75(item: PageSpeedInsights): Record<FieldAcronym, FieldP75 | null> {
  const result = {} as Record<FieldAcronym, FieldP75 | null>;
  for (const acronym of Object.keys(FIELD_KEYS) as FieldAcronym[]) {
    const key = FIELD_KEYS[acronym];
    const scopes = [
      ["url", item.loadingExperience?.metrics?.[key]],
      ["origin", item.originLoadingExperience?.metrics?.[key]],
    ] as const;
    const hit = scopes.find(([, metric]) => typeof metric?.percentile === "number");
    if (!hit) {
      result[acronym] = null;
      continue;
    }
    const [scope, metric] = hit as ["url" | "origin", UserPageLoadMetricV5];
    const p = metric.percentile;
    result[acronym] = {
      value: acronym === "CLS" ? p / 100 : p,
      display: acronym === "CLS" ? formatFieldPercentile(key, p) : formatMs(p),
      scope,
    };
  }
  return result;
}
