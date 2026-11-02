/**
 * A small Lantern-style replay of a page load. The trace gives observed request
 * and main-thread timings but no initiators, so dependencies are inferred from
 * timing: a request waits for the document, script or stylesheet that finished
 * just before the renderer asked for it, and a task waits for the file it ran.
 * The graph is then replayed on the throttled link and CPU: per-origin
 * connections with handshakes, TCP slow start, bandwidth shared by overlapping
 * downloads, and CPU time multiplied by the slowdown.
 */

const TCP_SEGMENT_SIZE = 1460;
const INITIAL_CWND = 10;
const H1_CONNECTIONS_PER_ORIGIN = 6;
/** How far a request's renderer start may trail its parent's end and still count as caused by it. */
const PARENT_TOLERANCE_MS = 20;
/** A task this close before a request is treated as the script that issued it. */
const TASK_TRIGGER_WINDOW_MS = 30;
/** A task starting this soon after a file finished is taken to be running it. */
const SCRIPT_RUN_WINDOW_MS = 50;

export type LanternThrottling = {
  rttMs: number;
  throughputKbps: number;
  cpuSlowdownMultiplier: number;
};

export type LanternRequest = {
  url: string;
  /** Observed times, ms from navigation start. */
  startMs: number;
  rendererStartMs?: number;
  endMs: number;
  bytes: number;
  protocol?: string;
  resourceType?: string;
  /** Chrome network priority; higher tiers are served first on the shared link. */
  priority?: string;
  isDocument: boolean;
  /** Server think time, used for the document only. */
  serverLatencyMs?: number;
};

export type LanternTask = { startMs: number; durationMs: number };

export type LanternTiming = { startMs: number; endMs: number };

export type LanternResult = {
  requests: LanternTiming[];
  tasks: LanternTiming[];
  requestDeps: number[][];
  taskDeps: number[][];
};

type NetNode = {
  kind: "net";
  index: number;
  deps: number[];
  origin: string;
  req: LanternRequest;
  state: "waiting" | "latency" | "transfer" | "done";
  startMs: number;
  dataStartMs: number;
  remainingBytes: number;
  floorEndMs: number;
  endMs: number;
};

type CpuNode = {
  kind: "cpu";
  index: number;
  deps: number[];
  task: LanternTask;
  state: "waiting" | "running" | "done";
  startMs: number;
  endMs: number;
};

type Node = NetNode | CpuNode;

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function isSecure(url: string): boolean {
  return url.startsWith("https:");
}

const PRIORITY_RANK: Record<string, number> = {
  VeryHigh: 4,
  High: 3,
  Medium: 2,
  Low: 1,
  VeryLow: 0,
};

const PARENT_TYPES = new Set(["Document", "Script", "Stylesheet"]);

/** Which request or task each node waited on, inferred from observed timing. */
export function inferDependencies(
  requests: LanternRequest[],
  tasks: LanternTask[],
): { requestDeps: number[][]; taskDeps: number[][] } {
  const doc = requests.findIndex((r) => r.isDocument);
  const orderedTasks = tasks.map((task, index) => ({ task, index }));

  const requestDeps = requests.map((req, i) => {
    if (req.isDocument) return [];
    const askedAt = req.rendererStartMs ?? req.startMs;
    const deps: number[] = [];

    // The file parsed or run just before this request was issued.
    let parent = -1;
    let parentEnd = -Infinity;
    requests.forEach((candidate, j) => {
      if (j === i || !PARENT_TYPES.has(candidate.resourceType ?? "")) return;
      const stylesheetOnly = req.resourceType === "Font" && candidate.resourceType !== "Stylesheet";
      if (stylesheetOnly) return;
      if (candidate.endMs > askedAt + PARENT_TOLERANCE_MS) return;
      // Parents must start earlier, which keeps the graph acyclic.
      if (candidate.startMs >= req.startMs) return;
      if (candidate.endMs > parentEnd) {
        parent = j;
        parentEnd = candidate.endMs;
      }
    });
    if (parent >= 0) deps.push(parent);
    else if (doc >= 0) deps.push(doc);

    // A script task that was running when the request went out issued it.
    for (const { task, index } of orderedTasks) {
      const end = task.startMs + task.durationMs;
      if (
        task.startMs < req.startMs &&
        task.startMs <= askedAt &&
        askedAt <= end + TASK_TRIGGER_WINDOW_MS
      ) {
        deps.push(requests.length + index);
        break;
      }
    }
    return deps;
  });

  const taskDeps = tasks.map((task, i) => {
    const deps: number[] = [];
    let best = -1;
    let bestEnd = -Infinity;
    requests.forEach((candidate, j) => {
      if (!PARENT_TYPES.has(candidate.resourceType ?? "")) return;
      if (
        candidate.startMs < task.startMs &&
        candidate.endMs <= task.startMs + 1 &&
        (candidate.resourceType === "Document" ||
          candidate.endMs >= task.startMs - SCRIPT_RUN_WINDOW_MS) &&
        candidate.endMs > bestEnd
      ) {
        best = j;
        bestEnd = candidate.endMs;
      }
    });
    if (best >= 0) deps.push(best);
    if (i > 0) deps.push(requests.length + i - 1);
    return deps;
  });

  return { requestDeps, taskDeps };
}

/** Ideal download time on a warm connection starting from the initial window. */
function slowStartMs(bytes: number, bytesPerMs: number, rttMs: number, cwndStart: number): number {
  if (bytes <= 0) return 0;
  if (rttMs <= 0 || bytesPerMs <= 0) return bytesPerMs > 0 ? bytes / bytesPerMs : 0;
  const maxCwnd = Math.max(1, Math.floor((bytesPerMs * rttMs) / TCP_SEGMENT_SIZE));
  let cwnd = Math.min(cwndStart, maxCwnd);
  let remaining = bytes;
  let time = 0;
  while (remaining > 0) {
    const roundBytes = cwnd * TCP_SEGMENT_SIZE;
    if (remaining <= roundBytes) {
      time += Math.max(remaining / bytesPerMs, 0);
      break;
    }
    remaining -= roundBytes;
    time += rttMs;
    cwnd = Math.min(cwnd * 2, maxCwnd);
  }
  return time;
}

export function simulateLoad(
  requests: LanternRequest[],
  tasks: LanternTask[],
  throttling: LanternThrottling,
): LanternResult {
  const { requestDeps, taskDeps } = inferDependencies(requests, tasks);
  const bytesPerMs = (throttling.throughputKbps * 1024) / 8 / 1000;
  const { rttMs, cpuSlowdownMultiplier } = throttling;

  const nodes: Node[] = [
    ...requests.map((req, index): NetNode => ({
      kind: "net",
      index,
      deps: requestDeps[index]!,
      origin: originOf(req.url),
      req,
      state: "waiting",
      startMs: 0,
      dataStartMs: 0,
      remainingBytes: req.bytes,
      floorEndMs: 0,
      endMs: 0,
    })),
    ...tasks.map((task, i): CpuNode => ({
      kind: "cpu",
      index: requests.length + i,
      deps: taskDeps[i]!,
      task,
      state: "waiting",
      startMs: 0,
      endMs: 0,
    })),
  ];

  const warmOrigins = new Set<string>();
  const connectionsInUse = new Map<string, number>();
  let cpuBusy: CpuNode | null = null;
  let time = 0;

  const isDone = (index: number) => nodes[index]!.state === "done";
  const ready = (node: Node) => node.state === "waiting" && node.deps.every(isDone);

  const firstByteDelay = (node: NetNode, cold: boolean): number => {
    const ssl = isSecure(node.req.url);
    const setup = cold ? rttMs * (ssl ? 3 : 2) : 0; // dns + tcp (+ tls)
    return setup + rttMs + (node.req.serverLatencyMs ?? 0);
  };

  const activeTransfers = () =>
    nodes.filter((n): n is NetNode => n.kind === "net" && n.state === "transfer");

  const guard = nodes.length * 8 + 1000;
  for (let step = 0; step < guard; step++) {
    // Start whatever can start at the current time.
    const queue = nodes.filter(ready).sort((a, b) => nodeObservedStart(a) - nodeObservedStart(b));
    for (const node of queue) {
      if (node.kind === "cpu") {
        if (cpuBusy) continue;
        node.state = "running";
        node.startMs = time;
        node.endMs = time + node.task.durationMs * cpuSlowdownMultiplier;
        cpuBusy = node;
        continue;
      }
      const limit = (node.req.protocol ?? "").startsWith("h2")
        ? Infinity
        : H1_CONNECTIONS_PER_ORIGIN;
      const inUse = connectionsInUse.get(node.origin) ?? 0;
      if (inUse >= limit) continue;
      connectionsInUse.set(node.origin, inUse + 1);
      const cold = !warmOrigins.has(node.origin);
      warmOrigins.add(node.origin);
      node.state = "latency";
      node.startMs = time;
      node.dataStartMs = time + firstByteDelay(node, cold);
      node.floorEndMs =
        node.dataStartMs + slowStartMs(node.req.bytes, bytesPerMs, rttMs, INITIAL_CWND);
    }

    let progressed = false;
    // Latency finished → transfer begins.
    for (const node of nodes) {
      if (node.kind === "net" && node.state === "latency" && node.dataStartMs <= time + 1e-9) {
        node.state = node.remainingBytes > 0 ? "transfer" : "done";
        if (node.state === "done") {
          progressed = true;
          node.endMs = Math.max(node.dataStartMs, time);
          connectionsInUse.set(node.origin, (connectionsInUse.get(node.origin) ?? 1) - 1);
        }
      }
    }

    const transfers = activeTransfers();
    const rankOf = (node: NetNode) => PRIORITY_RANK[node.req.priority ?? ""] ?? 2;
    let topRank = -Infinity;
    for (const node of transfers) topRank = Math.max(topRank, rankOf(node));
    const served = transfers.filter((node) => rankOf(node) === topRank).length;
    const rateOf = (node: NetNode) => (rankOf(node) === topRank ? bytesPerMs / served : 0);

    // Next event time.
    let next = Infinity;
    if (cpuBusy) next = Math.min(next, cpuBusy.endMs);
    for (const node of nodes) {
      if (node.kind === "net" && node.state === "latency") next = Math.min(next, node.dataStartMs);
    }
    for (const node of transfers) {
      const rate = rateOf(node);
      const finish = rate > 0 ? time + node.remainingBytes / rate : Infinity;
      next = Math.min(next, finish);
    }
    if (!Number.isFinite(next)) {
      if (progressed) continue;
      break;
    }
    next = Math.max(next, time);

    const dt = next - time;
    for (const node of transfers) node.remainingBytes -= dt * rateOf(node);
    time = next;

    for (const node of transfers) {
      if (node.remainingBytes <= 1e-6 && time >= node.floorEndMs - 1e-9) {
        node.state = "done";
        node.endMs = time;
        connectionsInUse.set(node.origin, (connectionsInUse.get(node.origin) ?? 1) - 1);
      } else if (node.remainingBytes <= 1e-6) {
        // Data is in but slow start would still be ramping: wait it out.
        node.remainingBytes = 0;
        node.state = "latency";
        node.dataStartMs = node.floorEndMs;
      }
    }
    if (cpuBusy && cpuBusy.endMs <= time + 1e-9) {
      cpuBusy.state = "done";
      cpuBusy = null;
    }

    if (nodes.every((n) => n.state === "done")) break;
  }

  const timing = (node: Node): LanternTiming => ({ startMs: node.startMs, endMs: node.endMs });
  return {
    requests: nodes.slice(0, requests.length).map(timing),
    tasks: nodes.slice(requests.length).map(timing),
    requestDeps,
    taskDeps,
  };

  function nodeObservedStart(node: Node): number {
    return node.kind === "net" ? node.req.startMs : node.task.startMs;
  }
}
