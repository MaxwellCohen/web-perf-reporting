// Port of Lighthouse Lantern DNSCache (times in ms).

import type { SimRequest } from "./graph";

const DNS_RESOLUTION_RTT_MULTIPLIER = 2;

function hostOf(request: SimRequest): string {
  try {
    return new URL(request.url).host;
  } catch {
    return request.origin;
  }
}

export class DNSCache {
  static rttMultiplier = DNS_RESOLUTION_RTT_MULTIPLIER;

  rtt: number;
  resolvedDomainNames = new Map<string, { resolvedAt: number }>();

  constructor({ rtt }: { rtt: number }) {
    this.rtt = rtt;
  }

  getTimeUntilResolution(
    request: SimRequest,
    options?: { requestedAt?: number; shouldUpdateCache?: boolean },
  ): number {
    const { requestedAt = 0, shouldUpdateCache = false } = options || {};

    const domain = hostOf(request);
    const cacheEntry = this.resolvedDomainNames.get(domain);
    let timeUntilResolved = this.rtt * DNSCache.rttMultiplier;
    if (cacheEntry) {
      const timeUntilCachedIsResolved = Math.max(cacheEntry.resolvedAt - requestedAt, 0);
      timeUntilResolved = Math.min(timeUntilCachedIsResolved, timeUntilResolved);
    }

    const resolvedAt = requestedAt + timeUntilResolved;
    if (shouldUpdateCache) {
      this.updateCacheResolvedAtIfNeeded(request, resolvedAt);
    }

    return timeUntilResolved;
  }

  updateCacheResolvedAtIfNeeded(request: SimRequest, resolvedAt: number): void {
    const domain = hostOf(request);
    const cacheEntry = this.resolvedDomainNames.get(domain) || { resolvedAt };
    cacheEntry.resolvedAt = Math.min(cacheEntry.resolvedAt, resolvedAt);
    this.resolvedDomainNames.set(domain, cacheEntry);
  }

  setResolvedAt(domain: string, resolvedAt: number): void {
    this.resolvedDomainNames.set(domain, { resolvedAt });
  }
}
