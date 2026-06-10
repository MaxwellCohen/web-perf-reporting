"use client";
import { NetworkOriginMsCard } from "@/features/page-speed-insights/network-metrics/NetworkOriginMsCard";
import { useNetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";

export function NetworkRTTCard() {
  
  const series = useNetworkMetricSeries();
  return (
    <NetworkOriginMsCard
      title="Network Round Trip Times (RTT)"
      valueColumnHeader="RTT"
      series={series}
      itemsField="networkRTT"
      msItemField="rtt"
    />
  );
}
