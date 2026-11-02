/**
 * Lighthouse's FCP and LCP estimate, rebuilt from what a PageSpeed report keeps:
 * observed request and main-thread timings, with no initiators or trace events.
 * Like Lantern, each metric simulates a pruned graph (only what had to finish
 * before the paint), once optimistically and once pessimistically, and averages.
 * Dependencies are inferred from timing.
 */
import { SimNode, type SimPriority } from "./graph";
import { simulate, type SimulatorOptions } from "./simulator";

const PARENT_TOLERANCE_MS = 0;
const PARENT_TYPES = new Set(["Document", "Script", "Stylesheet"]);

export type LanternInputRequest = {
  url: string;
  startMs: number;
  rendererStartMs?: number;
  endMs: number;
  transferSize: number;
  resourceSize: number;
  protocol: string;
  resourceType: string;
  priority: string;
};

export type LanternInputTask = { startMs: number; durationMs: number };

export type LanternThrottlingInput = {
  rttMs: number;
  throughputKbps: number;
  cpuSlowdownMultiplier: number;
};

export type LanternGraphInput = {
  requests: LanternInputRequest[];
  tasks: LanternInputTask[];
  /** Server think time for the main document. */
  documentServerResponseMs?: number;
  /** URLs Lighthouse reported as render-blocking; replaces the priority guess when given. */
  renderBlockingUrls?: Set<string>;
};

export type LanternGraph = {
  root: SimNode;
  requestNodes: SimNode[];
  cpuNodes: SimNode[];
};

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function asPriority(priority: string): SimPriority {
  return priority === "VeryHigh" ||
    priority === "High" ||
    priority === "Medium" ||
    priority === "Low" ||
    priority === "VeryLow"
    ? priority
    : "Medium";
}

const BLOCKING_TYPES = new Set(["Document", "Stylesheet", "Script"]);

/**
 * Lantern's NetworkNode.hasRenderBlockingPriority(). Reports don't keep the
 * trace's blocking flag, so use Lighthouse's render-blocking list when we have
 * it, and otherwise the priority rule limited to the types that can block paint
 * (fonts are VeryHigh but never block first paint).
 */
export function makeBlockingTest(renderBlockingUrls: Set<string> | undefined) {
  return (node: SimNode): boolean => {
    const request = node.request!;
    if (request.isMainDocument) return true;
    if (!BLOCKING_TYPES.has(request.resourceType)) return false;
    if (renderBlockingUrls) return renderBlockingUrls.has(request.url);
    if (request.priority === "VeryHigh") return true;
    return request.priority === "High" && request.resourceType === "Script";
  };
}

export function buildGraph(input: LanternGraphInput): LanternGraph {
  const { requests, tasks } = input;
  const documentIndex = Math.max(
    0,
    requests.findIndex((r) => r.resourceType === "Document"),
  );

  const requestNodes = requests.map(
    (r, i) =>
      new SimNode({
        id: `net-${i}`,
        type: "network",
        startTime: r.startMs,
        endTime: r.endMs,
        request: {
          url: r.url,
          origin: originOf(r.url),
          protocol: r.protocol || "h2",
          resourceType: r.resourceType,
          priority: asPriority(r.priority),
          transferSize: r.transferSize,
          resourceSize: r.resourceSize,
          isMainDocument: i === documentIndex,
        },
      }),
  );
  const cpuNodes = tasks.map(
    (t, i) =>
      new SimNode({ id: `cpu-${i}`, type: "cpu", startTime: t.startMs, duration: t.durationMs }),
  );
  const root = requestNodes[documentIndex]!;

  requests.forEach((r, i) => {
    const node = requestNodes[i]!;
    if (node === root) return;
    const askedAt = r.rendererStartMs ?? r.startMs;

    // The file parsed or run just before the renderer asked for this one.
    let parent: SimNode | undefined;
    let parentEnd = -Infinity;
    requests.forEach((candidate, j) => {
      if (j === i || !PARENT_TYPES.has(candidate.resourceType)) return;
      if (candidate.startMs >= r.startMs || candidate.endMs > askedAt + PARENT_TOLERANCE_MS) return;
      if (r.resourceType === "Font" && candidate.resourceType !== "Stylesheet") return;
      if (candidate.endMs > parentEnd) {
        parent = requestNodes[j];
        parentEnd = candidate.endMs;
      }
    });
    const dependency = parent ?? root;
    if (!dependency.isDependentOn(node)) node.addDependency(dependency);
  });

  cpuNodes.forEach((node) => {
    if (node.startTime >= root.startTime && !root.isDependentOn(node)) node.addDependency(root);
  });

  return { root, requestNodes, cpuNodes };
}

type PruneOptions = {
  cutoffMs: number;
  treatNodeAsRenderBlocking: (node: SimNode) => boolean;
  /** CPU tasks to keep: the first parse and the task that painted. */
  cpuNodes: SimNode[];
  keepLayoutNodes?: boolean;
};

function renderBlockingCpuIds(cpuNodes: SimNode[], cutoffMs: number): Set<string> {
  const ids = new Set<string>();
  const early = cpuNodes.filter((n) => n.startTime <= cutoffMs);
  const first = early[0];
  if (first) ids.add(first.id);
  const painter =
    early.find((n) => n.startTime <= cutoffMs && n.endTime >= cutoffMs) ?? early[early.length - 1];
  if (painter) ids.add(painter.id);
  return ids;
}

export function pruneGraph(graph: LanternGraph, options: PruneOptions): SimNode {
  const cpuIds = renderBlockingCpuIds(options.cpuNodes, options.cutoffMs);
  return graph.root.cloneWithRelationships((node) => {
    if (node.type === "network") {
      const endedAfter = node.endTime > options.cutoffMs || node.startTime > options.cutoffMs;
      if (endedAfter && !node.isMainDocument()) return false;
      return options.treatNodeAsRenderBlocking(node);
    }
    return cpuIds.has(node.id);
  });
}

function isNotLowPriorityImage(node: SimNode): boolean {
  if (node.type !== "network") return true;
  const request = node.request!;
  return !(
    request.resourceType === "Image" &&
    (request.priority === "Low" || request.priority === "VeryLow")
  );
}

export type LanternObserved = {
  fcpMs: number;
  lcpMs?: number;
  /** True when the LCP element is text, so LCP follows the FCP graphs. */
  lcpIsText?: boolean;
};

export type LanternEstimate = {
  fcp: { optimistic: number; pessimistic: number; timing: number };
  lcp?: { optimistic: number; pessimistic: number; timing: number };
};

function simulatorOptions(
  throttling: LanternThrottlingInput,
  graph: LanternGraph,
  documentServerResponseMs: number | undefined,
): SimulatorOptions {
  const serverResponseTimeByOrigin = new Map<string, number>();
  if (documentServerResponseMs != null) {
    serverResponseTimeByOrigin.set(graph.root.request!.origin, documentServerResponseMs);
  }
  return {
    rtt: throttling.rttMs,
    throughput: throttling.throughputKbps * 1024,
    cpuSlowdownMultiplier: throttling.cpuSlowdownMultiplier,
    serverResponseTimeByOrigin,
  };
}

export function estimateMetrics(
  input: LanternGraphInput,
  throttling: LanternThrottlingInput,
  observed: LanternObserved,
): LanternEstimate {
  const graph = buildGraph(input);
  const options = simulatorOptions(throttling, graph, input.documentServerResponseMs);
  const run = (cutoffMs: number, block: (node: SimNode) => boolean) =>
    simulate(
      pruneGraph(graph, { cutoffMs, treatNodeAsRenderBlocking: block, cpuNodes: graph.cpuNodes }),
      options,
    );

  const blocking = makeBlockingTest(input.renderBlockingUrls);
  const optimisticFcp = run(
    observed.fcpMs,
    (n) => blocking(n) && n.request?.resourceType !== "Script",
  );
  const pessimisticFcp = run(observed.fcpMs, blocking);
  const fcp = {
    optimistic: optimisticFcp.timeInMs,
    pessimistic: pessimisticFcp.timeInMs,
    timing: (optimisticFcp.timeInMs + pessimisticFcp.timeInMs) / 2,
  };

  if (observed.lcpMs == null) return { fcp };
  const textLcp = Math.abs(observed.lcpMs - observed.fcpMs) < 1 && (observed.lcpIsText ?? true);
  if (textLcp) return { fcp, lcp: fcp };

  const lastNotOffscreen = (nodeTimings: Map<SimNode, { endTime: number }>) =>
    Math.max(
      ...[...nodeTimings].filter(([n]) => isNotLowPriorityImage(n)).map(([, t]) => t.endTime),
    );
  const optimisticLcp = run(observed.lcpMs, isNotLowPriorityImage);
  const pessimisticLcp = run(observed.lcpMs, () => true);
  const lcpOptimistic = lastNotOffscreen(optimisticLcp.nodeTimings);
  const lcpPessimistic = lastNotOffscreen(pessimisticLcp.nodeTimings);
  return {
    fcp,
    lcp: {
      optimistic: lcpOptimistic,
      pessimistic: lcpPessimistic,
      timing: (lcpOptimistic + lcpPessimistic) / 2,
    },
  };
}
