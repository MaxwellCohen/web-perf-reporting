import type { CwvMetricAcronym } from "@/features/page-speed-insights/metricCauseAudits";
import { summarizeReport } from "@/features/page-speed-insights/dashboard-view/reportScoreSummary";
import type { PageSpeedInsights } from "@/lib/schema";

type FormFactor = "mobile" | "desktop";

/** Lighthouse v12 scoring curves: value at score 0.9 (p10) and at score 0.5 (median). */
const CURVES: Record<FormFactor, Record<CwvMetricAcronym, { p10: number; median: number }>> = {
  mobile: {
    FCP: { p10: 1800, median: 3000 },
    LCP: { p10: 2500, median: 4000 },
    TBT: { p10: 200, median: 600 },
    CLS: { p10: 0.1, median: 0.25 },
    SI: { p10: 3387, median: 5800 },
  },
  desktop: {
    FCP: { p10: 934, median: 1600 },
    LCP: { p10: 1200, median: 2400 },
    TBT: { p10: 150, median: 350 },
    CLS: { p10: 0.1, median: 0.25 },
    SI: { p10: 1311, median: 2300 },
  },
};

/** erfcinv(0.2): puts the p10 value at exactly score 0.9. */
const ERFC_INV_ONE_FIFTH = 0.9061938024368232;

/** Numerical Recipes erfc approximation (fractional error < 1.2e-7). */
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
    );
  return x >= 0 ? r : 2 - r;
}

function toFormFactor(value: string | undefined): FormFactor {
  return value === "desktop" ? "desktop" : "mobile";
}

export function formFactorOf(item: PageSpeedInsights): FormFactor {
  return toFormFactor(item.lighthouseResult?.configSettings?.formFactor);
}

/** Lighthouse log-normal score (0..1) for a raw metric value. */
export function metricScore(acronym: CwvMetricAcronym, value: number, formFactor: string): number {
  if (value <= 0) return 1;
  const { p10, median } = CURVES[toFormFactor(formFactor)][acronym];
  const x = (Math.log(value / median) * ERFC_INV_ONE_FIFTH) / Math.log(median / p10);
  return Math.min(1, Math.max(0, 0.5 * erfc(x)));
}

/** Performance points lost by a metric with this weight (a % of the score) and score. */
export function pointsLost(weight: number, score: number): number {
  return weight * (1 - score);
}

/** Performance points gained if each listed metric dropped by its saving (ms; CLS units). */
export function estimatePointsGained(
  item: PageSpeedInsights,
  savings: Partial<Record<CwvMetricAcronym, number>>,
): number {
  const formFactor = formFactorOf(item);
  const audits = item.lighthouseResult?.audits ?? {};
  let gained = 0;
  for (const metric of summarizeReport({ item, label: "" }).metrics) {
    const saving = savings[metric.acronym];
    const value = audits[metric.id]?.numericValue;
    if (!saving || typeof value !== "number" || metric.weight === null) continue;
    const after = metricScore(metric.acronym, Math.max(0, value - saving), formFactor);
    gained += metric.weight * (after - metricScore(metric.acronym, value, formFactor));
  }
  return Math.round(gained * 10) / 10;
}
