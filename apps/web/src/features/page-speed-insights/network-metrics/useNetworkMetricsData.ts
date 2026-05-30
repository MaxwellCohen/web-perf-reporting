import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { groupBy, getNumber } from "@/lib/utils";
import { AuditDetailTable, TableItem } from "@/lib/schema";

type MetricsAuditDetails = {
  details?: {
    items?: Array<Record<string, unknown>>;
  };
};

export type NetworkMetricSeries = {
  label: string;
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

export function mapItemsToNetworkMetrics(items: InsightsContextItem[]): NetworkMetricSeries[] {
  return items.map(({ item, label }) => {
    const metricsAudit = item?.lighthouseResult?.audits?.metrics as MetricsAuditDetails | undefined;
    const metricsDetails = metricsAudit?.details?.items?.[0];

    return {
      label,
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
