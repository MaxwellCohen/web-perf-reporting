import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { groupBy, getNumber } from "@/lib/utils";
import { AuditDetailTable, TableItem } from "@/lib/schema";
import { collectTimelineSources } from "@/features/page-speed-insights/page-load-timeline/collectTimelineSources";

type MetricsAuditDetails = {
  details?: {
    items?: Array<Record<string, unknown>>;
  };
};

export type NetworkMetricSeries = {
  label: string;
  /** Present when times were warped onto Lighthouse simulated throttling. */
  simulationLabel?: string;
  ttfb: number;
  fcp: number;
  lcp: number;
  speedIndex: number;
  totalBlockingTime: number;
  domContentLoaded: number;
  loadTime: number;
  interactive: number;
  observedNavigationStart: number;
  observedFirstPaint: number;
  observedFirstContentfulPaint: number;
  observedLargestContentfulPaint: number;
  observedFirstContentfulPaintAllFrames: number;
  observedFirstVisualChange: number;
  observedLargestContentfulPaintAllFrames: number;
  observedLastVisualChange: number;
  observedTraceEnd: number;
  networkRequests: TableItem[];
  networkRTT: TableItem[];
  serverLatency: TableItem[];
};

export type NetworkRequestStatsRow = {
  label: string;
  totalRequests: number;
  totalTransferSize: number;
  totalResourceSize: number;
  byResourceType: Record<string, TableItem[]>;
  topResources: TableItem[];
};

/** `getNumber` can be undefined; metrics rows use 0 when Lighthouse omits a value. */
function metricNumber(value: unknown): number {
  return getNumber(value) ?? 0;
}

function orMetric(adjusted: number | undefined, fallback: number): number {
  return adjusted != null && Number.isFinite(adjusted) ? adjusted : fallback;
}

export function mapItemsToNetworkMetrics(items: InsightsContextItem[]): NetworkMetricSeries[] {
  return items.map((entry) => {
    const { item, label } = entry;
    const metricsAudit = item?.lighthouseResult?.audits?.metrics as MetricsAuditDetails | undefined;
    const metricsDetails = metricsAudit?.details?.items?.[0];
    const load = collectTimelineSources(entry);

    const series: NetworkMetricSeries = {
      label,
      simulationLabel: load?.simulationLabel,
      ttfb: metricNumber(metricsDetails?.timeToFirstByte),
      fcp: metricNumber(metricsDetails?.firstContentfulPaint),
      lcp: metricNumber(metricsDetails?.largestContentfulPaint),
      speedIndex: metricNumber(metricsDetails?.speedIndex),
      totalBlockingTime: metricNumber(metricsDetails?.totalBlockingTime),
      domContentLoaded: metricNumber(metricsDetails?.observedDomContentLoaded),
      loadTime: metricNumber(metricsDetails?.observedLoad),
      interactive: metricNumber(metricsDetails?.interactive),
      observedNavigationStart: metricNumber(metricsDetails?.observedNavigationStart),
      observedFirstPaint: metricNumber(metricsDetails?.observedFirstPaint),
      observedFirstContentfulPaint: metricNumber(metricsDetails?.observedFirstContentfulPaint),
      observedLargestContentfulPaint: metricNumber(metricsDetails?.observedLargestContentfulPaint),
      observedFirstContentfulPaintAllFrames: metricNumber(
        metricsDetails?.observedFirstContentfulPaintAllFrames,
      ),
      observedFirstVisualChange: metricNumber(metricsDetails?.observedFirstVisualChange),
      observedLargestContentfulPaintAllFrames: metricNumber(
        metricsDetails?.observedLargestContentfulPaintAllFrames,
      ),
      observedLastVisualChange: metricNumber(metricsDetails?.observedLastVisualChange),
      observedTraceEnd: metricNumber(metricsDetails?.observedTraceEnd),
      networkRequests:
        (item?.lighthouseResult?.audits?.["network-requests"]?.details as AuditDetailTable)
          ?.items || [],
      networkRTT:
        (item?.lighthouseResult?.audits?.["network-rtt"]?.details as AuditDetailTable)?.items || [],
      serverLatency:
        (item?.lighthouseResult?.audits?.["network-server-latency"]?.details as AuditDetailTable)
          ?.items || [],
    };

    if (!load) return series;

    // Observed paints / load events: absolute ms on the lab clock.
    const adjusted: NetworkMetricSeries = {
      ...series,
      simulationLabel: load.simulationLabel,
      domContentLoaded: orMetric(load.dcl, series.domContentLoaded),
      loadTime: orMetric(load.load, series.loadTime),
      observedFirstPaint: orMetric(load.firstPaint, series.observedFirstPaint),
      observedFirstVisualChange: orMetric(load.firstVisual, series.observedFirstVisualChange),
      observedFirstContentfulPaint: orMetric(load.observedFcp, series.observedFirstContentfulPaint),
      observedLargestContentfulPaint: orMetric(
        load.observedLcp,
        series.observedLargestContentfulPaint,
      ),
      observedFirstContentfulPaintAllFrames: orMetric(
        load.observedFcpAllFrames,
        series.observedFirstContentfulPaintAllFrames,
      ),
      observedLargestContentfulPaintAllFrames: orMetric(
        load.observedLcpAllFrames,
        series.observedLargestContentfulPaintAllFrames,
      ),
      observedLastVisualChange: orMetric(load.lastVisual, series.observedLastVisualChange),
      observedTraceEnd: orMetric(load.traceEnd, series.observedTraceEnd),
    };

    // Score metrics already match the lab clock when Lantern simulation is on.
    if (load.simulationLabel) {
      adjusted.ttfb = orMetric(load.ttfb, series.ttfb);
      adjusted.fcp = orMetric(load.fcp, series.fcp);
      adjusted.lcp = orMetric(load.lcp, series.lcp);
      adjusted.interactive = orMetric(load.interactive, series.interactive);
    }

    return adjusted;
  });
}

export function mapNetworkMetricsToStats(
  networkMetrics: NetworkMetricSeries[],
): NetworkRequestStatsRow[] {
  return networkMetrics.map(({ networkRequests, label }) => {
    if (!networkRequests.length) {
      return {
        label,
        totalRequests: 0,
        totalTransferSize: 0,
        totalResourceSize: 0,
        byResourceType: {},
        topResources: [],
      };
    }

    const totalRequests = networkRequests.length;
    const totalTransferSize = networkRequests.reduce((acc, curr) => {
      const value = curr?.transferSize;
      return acc + (typeof value === "number" ? value : 0);
    }, 0);
    const totalResourceSize = networkRequests.reduce((acc, curr) => {
      const value = curr?.resourceSize;
      return acc + (typeof value === "number" ? value : 0);
    }, 0);

    const byResourceType = groupBy(networkRequests, (row: TableItem) => {
      const resourceType = row?.resourceType;
      return typeof resourceType === "string" ? resourceType : "Unknown";
    });

    const topResources = [...networkRequests].sort((a: TableItem, b: TableItem) => {
      const aSize = typeof a?.transferSize === "number" ? a.transferSize : 0;
      const bSize = typeof b?.transferSize === "number" ? b.transferSize : 0;
      return bSize - aSize;
    });

    return {
      label,
      totalRequests,
      totalTransferSize,
      totalResourceSize,
      byResourceType,
      topResources,
    };
  });
}
