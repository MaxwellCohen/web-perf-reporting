import metricRows from "@/features/page-speed-insights/lighthouseSummaryMetricRows.json";

/** Ordered Lighthouse diagnostics/metrics keys for summary table sorting and debug value format. */
export type LighthouseSummaryMetricDebugFormat = "plain" | "time" | "bytes" | "count" | "ts";

export type LighthouseSummaryMetricDefinition = {
  id: string;
  label: string;
  debugFormat: LighthouseSummaryMetricDebugFormat;
};

const FORMAT_SET = new Set<LighthouseSummaryMetricDebugFormat>([
  "plain",
  "time",
  "bytes",
  "count",
  "ts",
]);

function asFormat(v: string): LighthouseSummaryMetricDebugFormat {
  if (!FORMAT_SET.has(v as LighthouseSummaryMetricDebugFormat)) {
    throw new Error(`Invalid lighthouse metric format: ${v}`);
  }
  return v as LighthouseSummaryMetricDebugFormat;
}

export const LIGHTHOUSE_SUMMARY_METRIC_DEFS: readonly LighthouseSummaryMetricDefinition[] = (
  metricRows as [string, string, string][]
).map(([id, label, fmt]) => ({
  id,
  label,
  debugFormat: asFormat(fmt),
}));
