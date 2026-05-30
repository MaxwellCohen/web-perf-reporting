import type { PageSpeedInsightsSnapshot } from "@/features/page-speed-insights/PageSpeedContext";
import {
  mapNetworkMetricsToStats,
  type NetworkMetricSeries,
  type NetworkRequestStatsRow,
} from "./useNetworkMetricsData";

/** Stable empty selection when context is incomplete (avoids new [] per getSnapshot). */
const EMPTY_NETWORK_REQUEST_STATS: NetworkRequestStatsRow[] = [];

/** If `networkRequestStats` is missing, derive once per series array reference (stable for useSyncExternalStore). */
const networkRequestStatsFallbackBySeries = new WeakMap<
  NetworkMetricSeries[],
  NetworkRequestStatsRow[]
>();

export function selectNetworkMetricSeries(
  snapshot: PageSpeedInsightsSnapshot,
): NetworkMetricSeries[] {
  return snapshot.context.networkMetricSeries;
}

export function selectNetworkRequestStats(
  snapshot: PageSpeedInsightsSnapshot,
): NetworkRequestStatsRow[] {
  const ctx = snapshot.context;
  if (ctx?.networkRequestStats !== undefined) {
    return ctx.networkRequestStats;
  }
  const series = ctx?.networkMetricSeries;
  if (!series?.length) {
    return EMPTY_NETWORK_REQUEST_STATS;
  }
  const cached = networkRequestStatsFallbackBySeries.get(series);
  if (cached) {
    return cached;
  }
  const computed = mapNetworkMetricsToStats(series);
  networkRequestStatsFallbackBySeries.set(series, computed);
  return computed;
}
