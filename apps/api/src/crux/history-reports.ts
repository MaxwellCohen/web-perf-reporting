type CruxDate = { year: number; month: number; day: number };

type DensityBin = {
  start?: number | string;
  end?: number | string;
  densities?: Array<number | string | null>;
};

type FractionSeries = { fractions?: Array<number | string | null> };

export type CruxHistoryResponse = {
  record: {
    key?: { url?: string; origin?: string; formFactor?: string };
    metrics?: Record<string, unknown>;
    collectionPeriods?: Array<{ firstDate: CruxDate; lastDate: CruxDate }>;
  };
  urlNormalizationDetails?: unknown;
};

const HISTOGRAM_FIELDS = [
  "cumulative_layout_shift",
  "experimental_time_to_first_byte",
  "interaction_to_next_paint",
  "largest_contentful_paint",
  "round_trip_time",
  "first_contentful_paint",
  "experimental_largest_contentful_paint_with_softnavs",
  "experimental_interaction_to_next_paint_with_softnavs",
  "experimental_cumulative_layout_shift_with_softnavs",
] as const;

const PERCENTILE_FIELDS = [
  "largest_contentful_paint_image_time_to_first_byte",
  "largest_contentful_paint_image_resource_load_delay",
  "largest_contentful_paint_image_resource_load_duration",
  "largest_contentful_paint_image_element_render_delay",
  "experimental_ad_count",
  "experimental_ad_density",
  "experimental_ad_cpu",
  "experimental_ad_kilobytes",
] as const;

/** Matches `formatDate` in the web app so imported row ids stay stable. */
export function formatCruxDate(data?: CruxDate): string {
  if (!data) return "";
  const date = new Date(data.year, data.month - 1, data.day);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function histogramAt(metric: Record<string, unknown> | null, index: number) {
  const series = metric?.histogramTimeseries;
  const percentiles = asRecord(metric?.percentilesTimeseries);
  if (!Array.isArray(series) || series.length < 3) return null;
  const bins = series.map((bin) => asRecord(bin)).filter((bin): bin is Record<string, unknown> => !!bin);
  if (bins.length < 3) return null;
  const p75s = percentiles?.p75s;
  const density = (bin: Record<string, unknown>) => {
    const densities = bin.densities;
    if (!Array.isArray(densities)) return 0;
    return +(densities[index] || 0);
  };
  return {
    histogram: [
      { start: bins[0].start, density: density(bins[0]), end: bins[0].end },
      { start: bins[1].start, density: density(bins[1]), end: bins[1].end },
      { start: bins[2].start, density: density(bins[2]) },
    ],
    percentiles: {
      p75: +(Array.isArray(p75s) ? p75s[index] || 0 : 0),
    },
  };
}

function fractionAt(series: unknown, index: number): number {
  const record = asRecord(series);
  const fractions = record?.fractions;
  if (!Array.isArray(fractions)) return 0;
  return +(fractions[index] || 0);
}

/**
 * Splits one CrUX history record into the per-period reports stored in Historical_Metrics.
 * Same shape as `convertCruxHistoryToReports` in the web app.
 */
export function historyResponseToReports(historicalData: CruxHistoryResponse): Record<string, unknown>[] {
  const periods = historicalData.record.collectionPeriods ?? [];
  const metrics = historicalData.record.metrics ?? {};

  return periods.map((period, index) => {
    const reportMetrics: Record<string, unknown> = {};

    for (const field of HISTOGRAM_FIELDS) {
      const histogram = histogramAt(asRecord(metrics[field]), index);
      if (histogram) reportMetrics[field] = histogram;
    }

    for (const field of PERCENTILE_FIELDS) {
      const metric = asRecord(metrics[field]);
      const percentiles = asRecord(metric?.percentilesTimeseries);
      const p75s = percentiles?.p75s;
      if (!Array.isArray(p75s)) continue;
      reportMetrics[field] = { percentiles: { p75: +(p75s[index] || 0) } };
    }

    const resourceType = asRecord(metrics.largest_contentful_paint_resource_type);
    const resourceFractions = asRecord(resourceType?.fractionTimeseries);
    if (resourceFractions) {
      reportMetrics.largest_contentful_paint_resource_type = {
        fractions: {
          image: fractionAt(resourceFractions.image, index),
          text: fractionAt(resourceFractions.text, index),
        },
      };
    }

    const navigation = asRecord(metrics.navigation_types);
    const navigationFractions = asRecord(navigation?.fractionTimeseries);
    if (navigationFractions) {
      reportMetrics.navigation_types = {
        fractions: Object.fromEntries(
          Object.entries(navigationFractions).map(([key, value]) => [key, fractionAt(value, index)]),
        ),
      };
    }

    const formFactors = asRecord(metrics.form_factors);
    const formFactorFractions = asRecord(formFactors?.fractionTimeseries);
    if (formFactorFractions) {
      reportMetrics.form_factors = {
        fractions: {
          desktop: fractionAt(formFactorFractions.desktop, index),
          phone: fractionAt(formFactorFractions.phone, index),
          tablet: fractionAt(formFactorFractions.tablet, index),
        },
      };
    }

    return {
      record: {
        key: historicalData.record.key,
        metrics: reportMetrics,
        collectionPeriod: period,
      },
      urlNormalizationDetails: historicalData.urlNormalizationDetails,
    };
  });
}
