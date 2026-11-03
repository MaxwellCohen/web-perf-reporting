import { getNumber } from "@/lib/utils";
import type { MetricsItem, RawNetworkRequest } from "./timelineSourceTypes";

export function observedTraceTtfb(
  metrics: MetricsItem,
  document: RawNetworkRequest | undefined,
  serverThink: number | undefined,
): number | undefined {
  const explicit = getNumber(metrics.observedTimeToFirstByte);
  if (explicit != null) return explicit;

  if (document?.networkRequestTime != null && serverThink != null) {
    const timeMs = document.networkRequestTime + serverThink;
    if (document.networkEndTime == null || timeMs <= document.networkEndTime) {
      return timeMs;
    }
  }

  return undefined;
}

export function traceTimeToFirstByte(
  metrics: MetricsItem,
  document: RawNetworkRequest | undefined,
  serverThink: number | undefined,
): { timeMs: number; observed: boolean } | undefined {
  const observed = observedTraceTtfb(metrics, document, serverThink);
  if (observed != null) return { timeMs: observed, observed: true };

  const simulated = getNumber(metrics.timeToFirstByte);
  if (simulated == null) return undefined;
  if (document?.networkEndTime != null && simulated > document.networkEndTime) {
    return undefined;
  }
  return { timeMs: simulated, observed: false };
}
