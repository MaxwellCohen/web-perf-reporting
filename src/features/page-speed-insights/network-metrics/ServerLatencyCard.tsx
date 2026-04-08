"use client";
import { NetworkOriginMsCard } from "@/features/page-speed-insights/network-metrics/NetworkOriginMsCard";
import { useNetworkMetricSeries } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";

export function ServerLatencyCard() {
  "use no memo";
  const series = useNetworkMetricSeries();
  return (
    <NetworkOriginMsCard
      title="Server Backend Latencies"
      valueColumnHeader="Latency"
      series={series}
      itemsField="serverLatency"
      msItemField="serverResponseTime"
    />
  );
}
