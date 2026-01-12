"use client";
import { useContext, useMemo } from "react";
import { InsightsContext } from "@/components/page-speed/PageSpeedContext";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { groupBy, getNumber } from "@/lib/utils";
import { AuditDetailTable, TableItem } from "@/lib/schema";
import { TimingMetricsCard } from "@/components/page-speed/network-metrics/TimingMetricsCard";
import { TimelineCard } from "@/components/page-speed/network-metrics/TimelineCard";
import { NetworkRequestsSummaryCard } from "@/components/page-speed/network-metrics/NetworkRequestsSummaryCard";
import { NetworkRTTCard } from "@/components/page-speed/network-metrics/NetworkRTTCard";
import { ServerLatencyCard } from "@/components/page-speed/network-metrics/ServerLatencyCard";
import { ResourceTypeBreakdownCard } from "@/components/page-speed/network-metrics/ResourceTypeBreakdownCard";
import { TopResourcesCard } from "@/components/page-speed/network-metrics/TopResourcesCard";
import { LCPBreakdownCard } from "@/components/page-speed/network-metrics/LCPBreakdownCard";

type MetricsAuditDetails = {
  details?: {
    items?: Array<Record<string, unknown>>;
  };
};

export function NetworkMetricsComponent() {
  const items = useContext(InsightsContext);
  
  const networkMetrics = useMemo(() => {
    return items.map(({ item, label }) => {
      const metricsAudit = item?.lighthouseResult?.audits?.metrics as MetricsAuditDetails | undefined;
      const metricsDetails = metricsAudit?.details?.items?.[0];
      
      return {
        label,
        ttfb: getNumber(metricsDetails?.timeToFirstByte),
        fcp: getNumber(metricsDetails?.firstContentfulPaint),
        lcp: getNumber(metricsDetails?.largestContentfulPaint),
        speedIndex: getNumber(metricsDetails?.speedIndex),
        totalBlockingTime: getNumber(metricsDetails?.totalBlockingTime),
        domContentLoaded: getNumber(metricsDetails?.observedDomContentLoaded),
        loadTime: getNumber(metricsDetails?.observedLoad),
        interactive: getNumber(metricsDetails?.interactive),
        observedNavigationStart: (typeof metricsDetails?.observedNavigationStart === 'number' ? metricsDetails.observedNavigationStart : 0),
        observedFirstPaint: getNumber(metricsDetails?.observedFirstPaint),
        observedFirstContentfulPaint: getNumber(metricsDetails?.observedFirstContentfulPaint),
        observedLargestContentfulPaint: getNumber(metricsDetails?.observedLargestContentfulPaint),
        observedFirstContentfulPaintAllFrames: getNumber(metricsDetails?.observedFirstContentfulPaintAllFrames),
        observedFirstVisualChange: getNumber(metricsDetails?.observedFirstVisualChange),
        observedLargestContentfulPaintAllFrames: getNumber(metricsDetails?.observedLargestContentfulPaintAllFrames),
        observedLastVisualChange: getNumber(metricsDetails?.observedLastVisualChange),
        observedTraceEnd: getNumber(metricsDetails?.observedTraceEnd),
        networkRequests: ((item?.lighthouseResult?.audits?.['network-requests']?.details as AuditDetailTable)?.items) || [],
        networkRTT: ((item?.lighthouseResult?.audits?.['network-rtt']?.details as AuditDetailTable)?.items) || [],
        serverLatency: ((item?.lighthouseResult?.audits?.['network-server-latency']?.details as AuditDetailTable)?.items) || [],
      };
    });
  }, [items]);

  // Calculate network request statistics
  const networkStats = useMemo(() => {
    return networkMetrics.map(({ networkRequests, label }) => {
      if (!networkRequests.length) return { label, totalRequests: 0, totalTransferSize: 0, totalResourceSize: 0, byResourceType: {}, topResources: [] };
      
      const totalRequests = networkRequests.length;
      const totalTransferSize = networkRequests.reduce((acc, curr) => {
        const value = curr?.transferSize;
        return acc + (typeof value === 'number' ? value : 0);
      }, 0);
      const totalResourceSize = networkRequests.reduce((acc, curr) => {
        const value = curr?.resourceSize;
        return acc + (typeof value === 'number' ? value : 0);
      }, 0);
      
      // Group by resource type
      const byResourceType = groupBy(networkRequests, (item: TableItem) => {
        const resourceType = item?.resourceType;
        return typeof resourceType === 'string' ? resourceType : 'Unknown';
      });
      
      // Get all resources sorted by transfer size
      const topResources = [...networkRequests]
        .sort((a: TableItem, b: TableItem) => {
          const aSize = typeof a?.transferSize === 'number' ? a.transferSize : 0;
          const bSize = typeof b?.transferSize === 'number' ? b.transferSize : 0;
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
  }, [networkMetrics]);

  if (!items.length) {
    return null;
  }

  return (
    <AccordionItem value={'networkMetrics'}>
      <AccordionTrigger>
        <div className="text-lg font-bold group-hover:underline">Network Metrics</div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <NetworkRequestsSummaryCard stats={networkStats} />
          <TimingMetricsCard metrics={networkMetrics} />
          <TimelineCard metrics={networkMetrics} />
          <LCPBreakdownCard metrics={items} />
          <div className="w-full md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <NetworkRTTCard metrics={networkMetrics.map(({ label, networkRTT }) => ({ label, networkRTT }))} />
            <ServerLatencyCard metrics={networkMetrics.map(({ label, serverLatency }) => ({ label, serverLatency }))} />
          </div>
          <ResourceTypeBreakdownCard stats={networkStats.map(({ label, byResourceType }) => ({ label, byResourceType }))} />
          <TopResourcesCard stats={networkStats.map(({ label, topResources }) => ({ label, topResources: topResources || [] }))} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
