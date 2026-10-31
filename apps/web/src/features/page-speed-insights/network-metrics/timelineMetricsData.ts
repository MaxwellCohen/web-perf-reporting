import type { NetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsData";

const TIMELINE_EVENT_MAP = {
  TTFB: "ttfb",
  FCP: "fcp",
  "FCP (Observed)": "observedFirstContentfulPaint",
  LCP: "lcp",
  "LCP (Observed)": "observedLargestContentfulPaint",
  "DOM Content Loaded": "domContentLoaded",
  Load: "loadTime",
  Interactive: "interactive",
} as const;

export type TimelineChartRow = {
  event: string;
  [reportLabel: string]: string | number | undefined;
};

export function sortNumeric(a: number | undefined, b: number | undefined): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a - b;
}

export function buildTimelineChartRows(
  series: readonly NetworkMetricSeries[],
  eventMap: Record<string, string> = TIMELINE_EVENT_MAP,
  /** Event whose value is pinned to 0 (the origin of the lab clock). */
  zeroEvent?: string,
): TimelineChartRow[] {
  const entries = Object.entries(eventMap) as Array<[string, keyof NetworkMetricSeries]>;
  const reportLabels = series.map((m) => m.label);
  const eventDataMap = new Map<string, Record<string, number | undefined>>();

  for (const metric of series) {
    for (const [eventLabel, propKey] of entries) {
      const rawValue = metric[propKey] as number | undefined;
      if (rawValue === undefined) continue;

      if (!eventDataMap.has(eventLabel)) {
        eventDataMap.set(eventLabel, {});
      }
      const eventData = eventDataMap.get(eventLabel)!;
      // Absolute ms from navigation start (lab clock when simulated).
      eventData[metric.label] = eventLabel === zeroEvent ? 0 : rawValue;
    }
  }

  const rows: TimelineChartRow[] = [];
  eventDataMap.forEach((data, eventLabel) => {
    const row: TimelineChartRow = { event: eventLabel };
    for (const reportLabel of reportLabels) {
      row[reportLabel] = data[reportLabel] ?? undefined;
    }
    rows.push(row);
  });

  if (reportLabels.length > 0) {
    const firstReportLabel = reportLabels[0];
    rows.sort((a, b) =>
      sortNumeric(
        a[firstReportLabel] as number | undefined,
        b[firstReportLabel] as number | undefined,
      ),
    );
  }

  return rows;
}
