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

export function NetworkMetricsComponent() {
  const items = useContext(InsightsContext);
  
  const networkMetrics = useMemo(() => {
    return items.map(({ item, label }) => {
      // Get TTFB from loading experience
      const ttfb = item?.loadingExperience?.metrics?.EXPERIMENTAL_TIME_TO_FIRST_BYTE;
      const fcp = item?.loadingExperience?.metrics?.FIRST_CONTENTFUL_PAINT_MS;
      const lcp = item?.loadingExperience?.metrics?.LARGEST_CONTENTFUL_PAINT_MS;
      const inp = item?.loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT;
      
      // Get timing metrics from metrics audit (more accurate)
      const metricsAudit = item?.lighthouseResult?.audits?.metrics;
      const metricsDetails = (metricsAudit as { details?: { items?: Array<Record<string, unknown>> } })?.details?.items?.[0];
      const ttfbFromMetrics = getNumber(metricsDetails?.timeToFirstByte);
      const fcpFromMetrics = getNumber(metricsDetails?.firstContentfulPaint);
      const lcpFromMetrics = getNumber(metricsDetails?.largestContentfulPaint);
      const speedIndex = getNumber(metricsDetails?.speedIndex);
      const totalBlockingTime = getNumber(metricsDetails?.totalBlockingTime);
      const domContentLoaded = getNumber(metricsDetails?.observedDomContentLoaded);
      const loadTime = getNumber(metricsDetails?.observedLoad);
      const interactive = getNumber(metricsDetails?.interactive);
      
      // Get network requests audit
      const networkRequestsAudit = item?.lighthouseResult?.audits?.['network-requests'];
      const networkRequestsDetails = networkRequestsAudit?.details as AuditDetailTable;
      
      // Get network RTT audit
      const networkRTTAudit = item?.lighthouseResult?.audits?.['network-rtt'];
      const networkRTTDetails = networkRTTAudit?.details as AuditDetailTable;
      
      // Get server latency audit
      const serverLatencyAudit = item?.lighthouseResult?.audits?.['network-server-latency'];
      const serverLatencyDetails = serverLatencyAudit?.details as AuditDetailTable;
      
      // Get observed events from metrics
      const observedNavigationStart = typeof metricsDetails?.observedNavigationStart === 'number' ? metricsDetails.observedNavigationStart : 0;
      const observedFirstPaint = getNumber(metricsDetails?.observedFirstPaint);
      const observedFirstContentfulPaint = getNumber(metricsDetails?.observedFirstContentfulPaint);
      const observedLargestContentfulPaint = getNumber(metricsDetails?.observedLargestContentfulPaint);
      
      // Extract additional metrics for timeline
      const observedFirstContentfulPaintAllFrames = getNumber(metricsDetails?.observedFirstContentfulPaintAllFrames);
      const observedFirstVisualChange = getNumber(metricsDetails?.observedFirstVisualChange);
      const observedLargestContentfulPaintAllFrames = getNumber(metricsDetails?.observedLargestContentfulPaintAllFrames);
      const observedLastVisualChange = getNumber(metricsDetails?.observedLastVisualChange);
      const observedTraceEnd = getNumber(metricsDetails?.observedTraceEnd);
      
      return {
        label,
        ttfb: ttfbFromMetrics || ttfb?.percentile,
        ttfbCategory: ttfb?.category,
        fcp: fcpFromMetrics || fcp?.percentile,
        fcpCategory: fcp?.category,
        lcp: lcpFromMetrics || lcp?.percentile,
        lcpCategory: lcp?.category,
        inp: inp?.percentile,
        inpCategory: inp?.category,
        speedIndex,
        totalBlockingTime,
        domContentLoaded,
        loadTime,
        interactive,
        observedNavigationStart,
        observedFirstPaint,
        observedFirstContentfulPaint,
        observedLargestContentfulPaint,
        observedFirstContentfulPaintAllFrames,
        observedFirstVisualChange,
        observedLargestContentfulPaintAllFrames,
        observedLastVisualChange,
        observedTraceEnd,
        networkRequests: networkRequestsDetails?.items || [],
        networkRTT: networkRTTDetails?.items || [],
        serverLatency: serverLatencyDetails?.items || [],
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
