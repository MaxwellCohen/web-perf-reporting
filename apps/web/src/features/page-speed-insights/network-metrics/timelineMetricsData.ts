import type { NetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsData";

export const TIMELINE_EVENT_MAP = {
  TTFB: "ttfb",
  FCP: "fcp",
  "FCP (Observed)": "observedFirstContentfulPaint",
  LCP: "lcp",
  "LCP (Observed)": "observedLargestContentfulPaint",
  "DOM Content Loaded": "domContentLoaded",
  Load: "loadTime",
  Interactive: "interactive",
} as const;

export type TimelineEventLabel = keyof typeof TIMELINE_EVENT_MAP;

const TIMELINE_EVENT_ENTRIES = Object.entries(TIMELINE_EVENT_MAP) as Array<
  [TimelineEventLabel, keyof NetworkMetricSeries]
>;

const EVENTS_WITH_TTFB = new Set<TimelineEventLabel>([
  "DOM Content Loaded",
  "Load",
  "FCP (Observed)",
  "LCP (Observed)",
]);

export type TimelineChartRow = {
  event: string;
  [reportLabel: string]: string | number | undefined;
};

function sortNumeric(a: number | undefined, b: number | undefined): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a - b;
}

export function buildTimelineChartRows(series: readonly NetworkMetricSeries[]): TimelineChartRow[] {
  const reportLabels = series.map((m) => m.label);
  const eventDataMap = new Map<string, Record<string, number | undefined>>();

  for (const metric of series) {
    const ttfb = metric.ttfb ?? 0;

    for (const [eventLabel, propKey] of TIMELINE_EVENT_ENTRIES) {
      const rawValue = metric[propKey] as number | undefined;
      if (rawValue === undefined) continue;

      if (!eventDataMap.has(eventLabel)) {
        eventDataMap.set(eventLabel, {});
      }
      const eventData = eventDataMap.get(eventLabel)!;

      if (eventLabel === "TTFB") {
        eventData[metric.label] = rawValue;
      } else if (EVENTS_WITH_TTFB.has(eventLabel)) {
        eventData[metric.label] = rawValue + ttfb;
      } else {
        eventData[metric.label] = rawValue;
      }
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
