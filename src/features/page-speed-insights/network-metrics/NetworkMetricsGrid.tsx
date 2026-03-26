"use client";

import { TimingMetricsCard } from "@/features/page-speed-insights/network-metrics/TimingMetricsCard";
import { TimelineCard } from "@/features/page-speed-insights/network-metrics/TimelineCard";
import { NetworkRequestsSummaryCard } from "@/features/page-speed-insights/network-metrics/NetworkRequestsSummaryCard";
import { NetworkRTTCard } from "@/features/page-speed-insights/network-metrics/NetworkRTTCard";
import { ServerLatencyCard } from "@/features/page-speed-insights/network-metrics/ServerLatencyCard";
import { ResourceTypeBreakdownCard } from "@/features/page-speed-insights/network-metrics/ResourceTypeBreakdownCard";
import { TopResourcesCard } from "@/features/page-speed-insights/network-metrics/TopResourcesCard";
import { LCPBreakdownCard } from "@/features/page-speed-insights/network-metrics/LCPBreakdownCard";

export function NetworkMetricsGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <NetworkRequestsSummaryCard />
      <TimingMetricsCard />
      <TimelineCard />
      <LCPBreakdownCard />
      <div className="grid w-full grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2 lg:col-span-3">
        <NetworkRTTCard />
        <ServerLatencyCard />
      </div>
      <ResourceTypeBreakdownCard />
      <TopResourcesCard />
    </div>
  );
}
