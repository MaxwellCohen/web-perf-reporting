/**
 * PageSpeed lab scores use Lighthouse's simulated throttling (Lantern): the
 * trace is collected on a fast connection, then replayed under a target RTT,
 * throughput, and CPU slowdown. This module moves timeline timestamps onto
 * that same clock.
 *
 * Paint milestones use Lighthouse's simulated values. Other times are
 * interpolated between those anchors. Network bars are at least as long as a
 * TCP slow-start estimate, and observed main-thread tasks are multiplied by
 * the CPU slowdown. A task that already finished before the next one started
 * on the trace stays in front of it, so slowed tasks queue instead of overlapping.
 */

const TCP_SEGMENT_SIZE = 1460;
const INITIAL_CONGESTION_WINDOW = 10;

export type SimulatedThrottling = {
  rttMs: number;
  throughputKbps: number;
  cpuSlowdownMultiplier: number;
  /** Short description, e.g. "Slow 4G, 4× CPU". */
  label: string;
};

/** Lighthouse `mobileSlow4G` — what PSI applies for a mobile lab run. */
export const MOBILE_SLOW_4G: Omit<SimulatedThrottling, "label"> = {
  rttMs: 150,
  throughputKbps: 1.6 * 1024,
  cpuSlowdownMultiplier: 4,
};

/** Lighthouse `desktopDense4G`. CPU stays at 1×; the network is still throttled. */
export const DESKTOP_DENSE_4G: Omit<SimulatedThrottling, "label"> = {
  rttMs: 40,
  throughputKbps: 10 * 1024,
  cpuSlowdownMultiplier: 1,
};

type Anchor = { observed: number; simulated: number };

export type TimedRequest = {
  url: string;
  networkRequestTime?: number;
  networkEndTime?: number;
  rendererStartTime?: number;
  transferSize?: number;
  protocol?: string;
  statusCode?: number;
  resourceType?: string;
  mimeType?: string;
};

export type TimedTask = {
  startTime: number;
  duration: number;
};

export type TimedFrame = {
  timing: number;
};

export type LcpSubpartTiming = {
  subpart: string;
  label: string;
  duration: number;
};

type ClockInput = {
  throttling: SimulatedThrottling;
  observedTtfb?: number;
  simulatedTtfb?: number;
  observedFcp?: number;
  simulatedFcp?: number;
  observedLcp?: number;
  simulatedLcp?: number;
  documentServerLatencyMs?: number;
};

export type TimelineClock = {
  throttling: SimulatedThrottling;
  mapTime: (observedMs: number) => number;
  adjustRequests: <T extends TimedRequest>(requests: T[]) => T[];
  adjustTasks: <T extends TimedTask>(tasks: T[]) => T[];
  adjustScreenshots: <T extends TimedFrame>(frames: T[]) => T[];
  adjustLcpSubparts: (
    subparts: LcpSubpartTiming[],
    parts: {
      simulatedTtfb?: number;
      simulatedLcp?: number;
      loadDelay?: number;
      loadDuration?: number;
    },
  ) => LcpSubpartTiming[];
};

function finite(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function withLabel(settings: Omit<SimulatedThrottling, "label">): SimulatedThrottling {
  const cpu = `${trimNumber(settings.cpuSlowdownMultiplier)}× CPU`;
  const mobile =
    settings.rttMs === MOBILE_SLOW_4G.rttMs &&
    settings.cpuSlowdownMultiplier === MOBILE_SLOW_4G.cpuSlowdownMultiplier &&
    Math.round(settings.throughputKbps) === Math.round(MOBILE_SLOW_4G.throughputKbps);
  if (mobile) return { ...settings, label: `Slow 4G, ${cpu}` };

  const desktop =
    settings.rttMs === DESKTOP_DENSE_4G.rttMs &&
    settings.cpuSlowdownMultiplier === DESKTOP_DENSE_4G.cpuSlowdownMultiplier &&
    Math.round(settings.throughputKbps) === Math.round(DESKTOP_DENSE_4G.throughputKbps);
  if (desktop) return { ...settings, label: `desktop network, ${cpu}` };

  const mbps = settings.throughputKbps / 1024;
  return {
    ...settings,
    label: `${trimNumber(settings.rttMs)} ms RTT, ${trimNumber(mbps)} Mbps, ${cpu}`,
  };
}

function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * PSI responses often omit `throttlingMethod` and still mean Lantern simulation.
 * `provided` and `devtools` already baked throttling into the trace.
 */
export function resolveSimulatedThrottling(configSettings: unknown): SimulatedThrottling | null {
  if (!configSettings || typeof configSettings !== "object") return null;
  const config = configSettings as Record<string, unknown>;
  const method = typeof config.throttlingMethod === "string" ? config.throttlingMethod : undefined;
  if (method === "provided" || method === "devtools") return null;

  const raw = config.throttling;
  if (raw && typeof raw === "object") {
    const throttling = raw as Record<string, unknown>;
    const rttMs = finite(throttling.rttMs);
    const throughputKbps = finite(throttling.throughputKbps);
    const cpuSlowdownMultiplier = finite(throttling.cpuSlowdownMultiplier);
    if (
      rttMs != null &&
      rttMs >= 0 &&
      throughputKbps != null &&
      throughputKbps > 0 &&
      cpuSlowdownMultiplier != null &&
      cpuSlowdownMultiplier > 0
    ) {
      return withLabel({ rttMs, throughputKbps, cpuSlowdownMultiplier });
    }
  }

  const formFactor = String(config.formFactor ?? config.emulatedFormFactor ?? "").toLowerCase();
  if (formFactor === "mobile") return withLabel(MOBILE_SLOW_4G);
  if (formFactor === "desktop") return withLabel(DESKTOP_DENSE_4G);
  return null;
}

function pushKnot(knots: Anchor[], observed: number | undefined, simulated: number | undefined) {
  if (observed == null || simulated == null || observed <= 0) return;
  const last = knots[knots.length - 1];
  if (!last || observed <= last.observed + 1 || simulated < last.simulated) return;
  knots.push({ observed, simulated });
}

function buildMapTime(input: ClockInput): (observedMs: number) => number {
  const knots: Anchor[] = [{ observed: 0, simulated: 0 }];
  const fcpAndLcpSeparated =
    input.observedFcp != null &&
    input.observedLcp != null &&
    input.observedLcp > input.observedFcp + 50;

  pushKnot(knots, input.observedTtfb, input.simulatedTtfb);
  pushKnot(knots, input.observedFcp, input.simulatedFcp);
  if (fcpAndLcpSeparated) pushKnot(knots, input.observedLcp, input.simulatedLcp);

  const last = knots[knots.length - 1]!;
  const lcpSharesPaintTime =
    !fcpAndLcpSeparated &&
    input.simulatedLcp != null &&
    input.observedLcp != null &&
    input.simulatedLcp > last.simulated;
  const cpu = input.throttling.cpuSlowdownMultiplier;

  return (observedMs: number) => {
    if (observedMs <= 0) return 0;

    for (let i = 1; i < knots.length; i++) {
      const prev = knots[i - 1]!;
      const next = knots[i]!;
      if (observedMs <= next.observed) {
        const span = next.observed - prev.observed;
        const frac = span === 0 ? 0 : (observedMs - prev.observed) / span;
        return prev.simulated + frac * (next.simulated - prev.simulated);
      }
    }

    // When observed FCP≈LCP but simulated LCP is much later, Lantern's extra
    // time is mostly CPU-bound element render delay. Stretch the first
    // (simulatedLcp − simulatedFcp) / cpu of observed time after paint across
    // that gap so main-thread work lands between FCP and LCP instead of after.
    if (
      lcpSharesPaintTime &&
      input.observedLcp != null &&
      input.simulatedFcp != null &&
      input.simulatedLcp != null &&
      observedMs > input.observedLcp
    ) {
      const simulatedFcp = input.simulatedFcp;
      const simulatedLcp = input.simulatedLcp;
      const gapMs = Math.max(0, simulatedLcp - simulatedFcp);
      const observedBudget = cpu > 0 ? gapMs / cpu : 0;
      const elapsed = observedMs - input.observedLcp;
      if (elapsed <= observedBudget) {
        return simulatedFcp + elapsed * cpu;
      }
      return simulatedLcp + (elapsed - observedBudget) * cpu;
    }

    const tailScale = knots.length > 1 ? cpu : 1;
    return last.simulated + (observedMs - last.observed) * tailScale;
  };
}

/**
 * Lantern's TCP slow-start download time. Throughput is kilobits/second, matching
 * Lighthouse throttling settings (`throughputKbps * 1024` bits/second).
 */
export function simulatedTransferMs(options: {
  bytes: number;
  rttMs: number;
  throughputKbps: number;
  serverLatencyMs: number;
  cold: boolean;
  ssl: boolean;
  h2: boolean;
}): number {
  const { bytes, rttMs, throughputKbps, serverLatencyMs, cold, ssl, h2 } = options;
  if (bytes <= 0 || throughputKbps <= 0) return 0;

  const bytesPerSecond = (throughputKbps * 1024) / 8;
  if (rttMs <= 0) {
    return serverLatencyMs + (bytes / bytesPerSecond) * 1000;
  }

  const oneWay = rttMs / 2;
  const twoWay = rttMs;
  const maxCwnd = Math.max(1, Math.floor((bytesPerSecond * (rttMs / 1000)) / TCP_SEGMENT_SIZE));

  let handshake = oneWay;
  if (!cold && h2) handshake = 0;
  else if (!cold) handshake = oneWay;
  else handshake = oneWay * 3 + (ssl ? twoWay : 0);

  const warmH2 = !cold && h2;
  const timeToFirstByte = warmH2 ? 0 : handshake + serverLatencyMs + oneWay;

  let cwnd = Math.min(INITIAL_CONGESTION_WINDOW, maxCwnd);
  let remaining = bytes - (timeToFirstByte > 0 ? cwnd * TCP_SEGMENT_SIZE : 0);
  let downloadTime = 0;
  let guard = 0;
  while (remaining > 0 && guard < 10000) {
    guard += 1;
    downloadTime += twoWay;
    cwnd = Math.max(Math.min(maxCwnd, cwnd * 2), 1);
    remaining -= cwnd * TCP_SEGMENT_SIZE;
  }

  return timeToFirstByte + downloadTime;
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function isSecure(url: string, protocol: string | undefined): boolean {
  if (url.startsWith("https:") || url.startsWith("wss:")) return true;
  return /h2|h3|quic/i.test(protocol ?? "");
}

function isMultiplexed(protocol: string | undefined): boolean {
  return /h2|h3|http\/2|http\/3|quic/i.test(protocol ?? "");
}

/** Server-side hops. 304 is a cache revalidation, not a navigation redirect. */
export function isNavigationRedirect(statusCode: number | undefined): boolean {
  return (
    statusCode === 301 ||
    statusCode === 302 ||
    statusCode === 303 ||
    statusCode === 307 ||
    statusCode === 308
  );
}

export function createTimelineClock(input: ClockInput): TimelineClock {
  const mapTime = buildMapTime(input);
  const { throttling } = input;

  return {
    throttling,
    mapTime,
    adjustRequests(requests) {
      const ordered = [...requests].sort(
        (a, b) => (a.networkRequestTime ?? 0) - (b.networkRequestTime ?? 0),
      );
      const firstOfOrigin = new Set<TimedRequest>();
      const seenOrigins = new Set<string>();
      for (const request of ordered) {
        const origin = originOf(request.url);
        if (seenOrigins.has(origin)) continue;
        seenOrigins.add(origin);
        firstOfOrigin.add(request);
      }

      // The first timed request is often a 3xx. Server latency and the TTFB
      // floor belong to the document that follows, not the redirect hop.
      const documentRequest = ordered.find(
        (request) =>
          request.networkRequestTime != null &&
          request.networkEndTime != null &&
          !isNavigationRedirect(request.statusCode),
      );

      return requests.map((request) => {
        if (request.networkRequestTime == null || request.networkEndTime == null) return request;
        const start = mapTime(request.networkRequestTime);
        const warpedEnd = mapTime(request.networkEndTime);
        const bytes = request.transferSize ?? 0;
        const cold = firstOfOrigin.has(request);
        const lantern =
          bytes > 0
            ? simulatedTransferMs({
                bytes,
                rttMs: throttling.rttMs,
                throughputKbps: throttling.throughputKbps,
                serverLatencyMs:
                  request === documentRequest ? (input.documentServerLatencyMs ?? 0) : 0,
                cold,
                ssl: isSecure(request.url, request.protocol),
                h2: isMultiplexed(request.protocol),
              })
            : 0;
        let end = Math.max(warpedEnd, start + lantern);
        if (
          request === documentRequest &&
          input.simulatedTtfb != null &&
          end < input.simulatedTtfb
        ) {
          end = input.simulatedTtfb;
        }
        return {
          ...request,
          networkRequestTime: start,
          networkEndTime: end,
          ...(request.rendererStartTime != null
            ? { rendererStartTime: mapTime(request.rendererStartTime) }
            : {}),
        };
      });
    },
    adjustTasks(tasks) {
      const cpu = throttling.cpuSlowdownMultiplier;
      const ordered = tasks
        .map((task, index) => ({ task, index }))
        .sort((a, b) => a.task.startTime - b.task.startTime || b.task.duration - a.task.duration);

      const placed = tasks.slice();
      let cursor = 0;
      let observedFrontier = -Infinity;

      for (const { task, index } of ordered) {
        const mappedStart = mapTime(task.startTime);
        const serial = task.startTime >= observedFrontier - 1;
        const startTime = serial ? Math.max(mappedStart, cursor) : mappedStart;
        const duration = task.duration * cpu;
        if (serial) {
          cursor = startTime + duration;
          observedFrontier = task.startTime + task.duration;
        }
        placed[index] = { ...task, startTime, duration };
      }

      return placed;
    },
    adjustScreenshots(frames) {
      return frames.map((frame) => ({ ...frame, timing: mapTime(frame.timing) }));
    },
    adjustLcpSubparts(subparts, parts) {
      const { simulatedTtfb, simulatedLcp, loadDelay, loadDuration } = parts;
      const labelFor = (subpart: string, fallback: string) =>
        subparts.find((part) => part.subpart === subpart)?.label ?? fallback;

      // Text LCP has no resource, so the insight only has an observed first byte.
      // When a resource exists, simulated lcpLoadDelay / lcpLoadDuration are
      // absolute times (resource start and finish), not phase lengths.
      if (simulatedLcp != null && simulatedTtfb != null) {
        const ttfb = Math.min(Math.max(0, simulatedTtfb), simulatedLcp);
        if (loadDelay != null && loadDuration != null) {
          const loadStart = Math.min(simulatedLcp, Math.max(ttfb, loadDelay));
          const loadEnd = Math.min(simulatedLcp, Math.max(loadStart, loadDuration));
          return [
            {
              subpart: "timeToFirstByte",
              label: labelFor("timeToFirstByte", "Time to first byte"),
              duration: ttfb,
            },
            {
              subpart: "resourceLoadDelay",
              label: labelFor("resourceLoadDelay", "Resource load delay"),
              duration: loadStart - ttfb,
            },
            {
              subpart: "resourceLoadDuration",
              label: labelFor("resourceLoadDuration", "Resource load duration"),
              duration: loadEnd - loadStart,
            },
            {
              subpart: "elementRenderDelay",
              label: labelFor("elementRenderDelay", "Element render delay"),
              duration: simulatedLcp - loadEnd,
            },
          ];
        }

        const rest = subparts.filter((part) => part.subpart !== "timeToFirstByte");
        const restTotal = rest.reduce((sum, part) => sum + part.duration, 0);
        const budget = simulatedLcp - ttfb;
        const firstByte = {
          subpart: "timeToFirstByte",
          label: labelFor("timeToFirstByte", "Time to first byte"),
          duration: ttfb,
        };
        if (restTotal <= 0) {
          return [
            firstByte,
            {
              subpart: "elementRenderDelay",
              label: labelFor("elementRenderDelay", "Element render delay"),
              duration: budget,
            },
          ];
        }
        const scale = budget / restTotal;
        const scaled = rest.map((part) => ({ ...part, duration: part.duration * scale }));
        return [firstByte, ...scaled];
      }

      const observedTotal = subparts.reduce((sum, part) => sum + part.duration, 0);
      if (simulatedLcp == null || observedTotal <= 0) return subparts;
      const scale = simulatedLcp / observedTotal;
      return subparts.map((part) => ({ ...part, duration: part.duration * scale }));
    },
  };
}
