"use client";
import {
  BytesCountSummaryCard,
  type BytesCountSummaryRow,
} from "@/features/page-speed-insights/shared/BytesCountSummaryCard";
import { useNetworkRequestStats } from "@/features/page-speed-insights/network-metrics/useNetworkMetricsStore";

export function NetworkRequestsSummaryCard() {
  const requestStats = useNetworkRequestStats() ?? [];
  const rows: BytesCountSummaryRow[] = requestStats.map((s) => ({
    label: s.label,
    count: s.totalRequests,
    totalTransferSize: s.totalTransferSize,
    totalResourceSize: s.totalResourceSize,
  }));
  return (
    <BytesCountSummaryCard
      title="Network Requests Summary"
      countColumnTitle="Total Requests"
      rows={rows}
    />
  );
}
