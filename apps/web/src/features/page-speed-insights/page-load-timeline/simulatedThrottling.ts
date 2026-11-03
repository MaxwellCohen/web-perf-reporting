/**
 * PageSpeed lab scores use Lighthouse's simulated throttling (Lantern): the
 * trace is collected on a fast connection, then replayed under a target RTT,
 * throughput, and CPU slowdown. This module moves timeline timestamps onto
 * that same clock.
 *
 * Paint milestones use Lighthouse's simulated values. Every other time, including
 * main-thread tasks, is interpolated between those anchors. Request durations are
 * at least connection setup plus transfer on the throttled link, with the
 * throughput split between downloads that overlap.
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
const MOBILE_SLOW_4G: Omit<SimulatedThrottling, "label"> = {
  rttMs: 150,
  throughputKbps: 1.6 * 1024,
  cpuSlowdownMultiplier: 4,
};

/** Lighthouse `desktopDense4G`. CPU stays at 1×; the network is still throttled. */
const DESKTOP_DENSE_4G: Omit<SimulatedThrottling, "label"> = {
  rttMs: 40,
  throughputKbps: 10 * 1024,
  cpuSlowdownMultiplier: 1,
};

type Anchor = { observed: number; simulated: number };

type TimedRequest = {
  url: string;
  networkRequestTime?: number;
  networkEndTime?: number;
  rendererStartTime?: number;
  transferSize?: number;
  protocol?: string;
  statusCode?: number;
  resourceType?: string;
  mimeType?: string;
  priority?: string;
};

type TimedTask = {
  startTime: number;
  duration: number;
};

type TimedFrame = {
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
  observedSpeedIndex?: number;
  simulatedSpeedIndex?: number;
  documentServerLatencyMs?: number;
};

type LcpSubpartParts = {
  simulatedTtfb?: number;
  simulatedLcp?: number;
  loadDelay?: number;
  loadDuration?: number;
};

/** Rebuild observed LCP subparts so they sum to the simulated LCP. */
export function adjustLcpSubparts(
  subparts: LcpSubpartTiming[],
  parts: LcpSubpartParts,
): LcpSubpartTiming[] {
  const { simulatedTtfb, simulatedLcp, loadDelay, loadDuration } = parts;
  const labelFor = (subpart: string, fallback: string) =>
    subparts.find((part) => part.subpart === subpart)?.label ?? fallback;

  // Text LCP has no resource, so the insight only has an observed first byte.
  // When a resource exists, Lighthouse's lcpLoadDelay / lcpLoadDuration are
  // phase lengths (ttfb + delay + duration + render delay = LCP).
  if (simulatedLcp != null && simulatedTtfb != null) {
    const ttfb = Math.min(Math.max(0, simulatedTtfb), simulatedLcp);
    if (loadDelay != null && loadDuration != null) {
      const loadStart = Math.min(simulatedLcp, ttfb + Math.max(0, loadDelay));
      const loadEnd = Math.min(
        simulatedLcp,
        loadStart + Math.max(0, loadDuration),
      );
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
    const scaled = rest.map((part) => ({
      ...part,
      duration: part.duration * scale,
    }));
    return [firstByte, ...scaled];
  }

  const observedTotal = subparts.reduce((sum, part) => sum + part.duration, 0);
  if (simulatedLcp == null || observedTotal <= 0) return subparts;
  const scale = simulatedLcp / observedTotal;
  return subparts.map((part) => ({ ...part, duration: part.duration * scale }));
}

export type TimelineClock = {
  throttling: SimulatedThrottling;
  mapTime: (observedMs: number) => number;
  /** Like `mapTime`, anchored on Speed Index; use for visual milestones so they match frames. */
  mapVisualTime: (observedMs: number) => number;
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
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function withLabel(
  settings: Omit<SimulatedThrottling, "label">,
): SimulatedThrottling {
  const cpu = `${trimNumber(settings.cpuSlowdownMultiplier)}× CPU`;
  const mobile =
    settings.rttMs === MOBILE_SLOW_4G.rttMs &&
    settings.cpuSlowdownMultiplier === MOBILE_SLOW_4G.cpuSlowdownMultiplier &&
    Math.round(settings.throughputKbps) ===
      Math.round(MOBILE_SLOW_4G.throughputKbps);
  if (mobile) return { ...settings, label: `Slow 4G, ${cpu}` };

  const desktop =
    settings.rttMs === DESKTOP_DENSE_4G.rttMs &&
    settings.cpuSlowdownMultiplier === DESKTOP_DENSE_4G.cpuSlowdownMultiplier &&
    Math.round(settings.throughputKbps) ===
      Math.round(DESKTOP_DENSE_4G.throughputKbps);
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
export function resolveSimulatedThrottling(
  configSettings: unknown,
): SimulatedThrottling | null {
  if (!configSettings || typeof configSettings !== "object") return null;
  const config = configSettings as Record<string, unknown>;
  const method =
    typeof config.throttlingMethod === "string"
      ? config.throttlingMethod
      : undefined;
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

  const formFactor = String(
    config.formFactor ?? config.emulatedFormFactor ?? "",
  ).toLowerCase();
  if (formFactor === "mobile") return withLabel(MOBILE_SLOW_4G);
  if (formFactor === "desktop") return withLabel(DESKTOP_DENSE_4G);
  return null;
}

function pushKnot(
  knots: Anchor[],
  observed: number | undefined,
  simulated: number | undefined,
) {
  if (observed == null || simulated == null || observed <= 0) return;
  const last = knots[knots.length - 1];
  if (!last || observed <= last.observed + 1 || simulated < last.simulated)
    return;
  knots.push({ observed, simulated });
}

function buildMapTime(
  input: ClockInput,
  options: { forFrames?: boolean } = {},
): (observedMs: number) => number {
  const knots: Anchor[] = [{ observed: 0, simulated: 0 }];
  const fcpAndLcpSeparated =
    input.observedFcp != null &&
    input.observedLcp != null &&
    input.observedLcp > input.observedFcp + 50;

  pushKnot(knots, input.observedTtfb, input.simulatedTtfb);
  pushKnot(knots, input.observedFcp, input.simulatedFcp);
  if (fcpAndLcpSeparated)
    pushKnot(knots, input.observedLcp, input.simulatedLcp);
  // After the last paint anchor, content keeps appearing at the pace Speed Index
  // slowed down (simulated ÷ observed) rather than the full CPU slowdown, which
  // would push late frames far past when the page actually finished painting.
  // Speed Index is an average, not an event time, so it is a slope here, not a knot.
  const frameSpeedIndex = options.forFrames
    ? input.simulatedSpeedIndex
    : undefined;
  const speedIndexScale =
    frameSpeedIndex != null && input.observedSpeedIndex
      ? Math.min(
          Math.max(frameSpeedIndex / input.observedSpeedIndex, 1),
          Math.max(input.throttling.cpuSlowdownMultiplier, 1),
        )
      : undefined;

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

    const tailScale = speedIndexScale ?? (knots.length > 1 ? cpu : 1);
    return last.simulated + (observedMs - last.observed) * tailScale;
  };
}

/**
 * Lantern's TCP slow-start download time. Throughput is kilobits/second, matching
 * Lighthouse throttling settings (`throughputKbps * 1024` bits/second).
 */
function simulatedTransferMs(options: {
  bytes: number;
  rttMs: number;
  throughputKbps: number;
  serverLatencyMs: number;
  cold: boolean;
  ssl: boolean;
  h2: boolean;
}): number {
  const { bytes, rttMs, throughputKbps, serverLatencyMs, cold, ssl, h2 } =
    options;
  if (bytes <= 0 || throughputKbps <= 0) return 0;

  const bytesPerSecond = (throughputKbps * 1024) / 8;
  if (rttMs <= 0) {
    return serverLatencyMs + (bytes / bytesPerSecond) * 1000;
  }

  const oneWay = rttMs / 2;
  const twoWay = rttMs;
  const maxCwnd = Math.max(
    1,
    Math.floor((bytesPerSecond * (rttMs / 1000)) / TCP_SEGMENT_SIZE),
  );

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

type TransferJob = { dataStartMs: number; bytes: number; weight: number };

/** Chrome network priority → rank. Higher ranks are served first on a shared link. */
const PRIORITY_WEIGHT: Record<string, number> = {
  VeryHigh: 4,
  High: 3,
  Medium: 2,
  Low: 1,
  VeryLow: 0,
};

/**
 * Finish times on one shared link. Chrome over HTTP/2 serves higher-priority
 * streams first, so only the highest-priority active tier receives bandwidth
 * (split evenly); lower tiers wait. That is why a Low-priority 6 MB image
 * does not slow a High-priority font, while the image itself finishes last.
 */
function shareBandwidth(jobs: TransferJob[], bytesPerMs: number): number[] {
  const ends = jobs.map((job) => job.dataStartMs);
  if (bytesPerMs <= 0) return ends;

  const pending = jobs
    .map((job, index) => ({ index, ...job }))
    .filter((job) => job.bytes > 0)
    .sort((a, b) => a.dataStartMs - b.dataStartMs);
  const active = new Map<number, number>();
  let time = 0;
  let next = 0;

  while (next < pending.length || active.size > 0) {
    if (active.size === 0) time = Math.max(time, pending[next]!.dataStartMs);
    while (next < pending.length && pending[next]!.dataStartMs <= time) {
      active.set(pending[next]!.index, pending[next]!.bytes);
      next++;
    }

    let topRank = -Infinity;
    for (const index of active.keys())
      topRank = Math.max(topRank, jobs[index]!.weight);
    let served = 0;
    for (const index of active.keys())
      if (jobs[index]!.weight === topRank) served++;
    const rateOf = (index: number) =>
      jobs[index]!.weight === topRank ? bytesPerMs / served : 0;
    let soonest = Infinity;
    for (const [index, remaining] of active) {
      const rate = rateOf(index);
      if (rate > 0) soonest = Math.min(soonest, remaining / rate);
    }
    const nextArrival =
      next < pending.length ? pending[next]!.dataStartMs - time : Infinity;
    const step = Math.min(soonest, nextArrival);

    for (const [index, remaining] of [...active]) {
      const left = remaining - step * rateOf(index);
      if (left <= 1e-6) {
        active.delete(index);
        ends[index] = time + step;
      } else {
        active.set(index, left);
      }
    }
    time += step;
  }
  return ends;
}

export function createTimelineClock(input: ClockInput): TimelineClock {
  // One clock for every observed time: interpolate between the simulated anchors
  // (TTFB, FCP, LCP, Speed Index) instead of scaling by CPU slowdown.
  const mapTime = buildMapTime(input, { forFrames: true });
  const mapFrameTime = mapTime;
  const { throttling } = input;

  return {
    throttling,
    mapTime,
    mapVisualTime: mapFrameTime,
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

      const bytesPerMs = (throttling.throughputKbps * 1024) / 8 / 1000;
      const timed = requests.map((request) => {
        if (
          request.networkRequestTime == null ||
          request.networkEndTime == null
        )
          return null;
        const start = mapTime(request.networkRequestTime);
        const bytes = request.transferSize ?? 0;
        // Connection setup and server wait, before any bytes flow.
        const latency =
          bytes > 0
            ? simulatedTransferMs({
                bytes: 1,
                rttMs: throttling.rttMs,
                throughputKbps: throttling.throughputKbps,
                serverLatencyMs:
                  request === documentRequest
                    ? (input.documentServerLatencyMs ?? 0)
                    : 0,
                cold: firstOfOrigin.has(request),
                ssl: isSecure(request.url, request.protocol),
                h2: isMultiplexed(request.protocol),
              })
            : 0;
        return {
          start,
          bytes,
          dataStartMs: start + latency,
          weight: PRIORITY_WEIGHT[request.priority ?? ""] ?? 2,
        };
      });
      const sharedEnds = shareBandwidth(
        timed.map((entry) => entry ?? { dataStartMs: 0, bytes: 0, weight: 1 }),
        bytesPerMs,
      );

      return requests.map((request, i) => {
        const entry = timed[i];
        if (!entry) return request;
        const warpedEnd = mapTime(request.networkEndTime!);
        let end = Math.max(
          warpedEnd,
          entry.start,
          entry.bytes > 0 ? sharedEnds[i]! : 0,
        );
        if (
          request === documentRequest &&
          input.simulatedTtfb != null &&
          end < input.simulatedTtfb
        ) {
          end = input.simulatedTtfb;
        }
        return {
          ...request,
          networkRequestTime: entry.start,
          networkEndTime: end,
          ...(request.rendererStartTime != null
            ? { rendererStartTime: mapTime(request.rendererStartTime) }
            : {}),
        };
      });
    },
    adjustTasks(tasks) {
      return tasks.map((task) => {
        const startTime = mapTime(task.startTime);
        const endTime = mapTime(task.startTime + task.duration);
        return {
          ...task,
          startTime,
          duration: Math.max(0, endTime - startTime),
        };
      });
    },
    adjustScreenshots(frames) {
      return frames.map((frame) => ({
        ...frame,
        timing: mapFrameTime(frame.timing),
      }));
    },
    adjustLcpSubparts,
  };
}
