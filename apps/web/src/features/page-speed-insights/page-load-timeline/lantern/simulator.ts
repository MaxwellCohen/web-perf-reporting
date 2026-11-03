// Port of Lighthouse Lantern Simulator (all times in ms, including CPU node durations).

import { ConnectionPool } from "./connectionPool";
import { DNSCache } from "./dnsCache";
import { SimNode, type SimPriority, type SimRequest } from "./graph";
import { SimulatorTimingMap, type NodeTimingState } from "./timingMap";
import { TCPConnection, type ConnectionTiming } from "./tcpConnection";

export const mobileSlow4G = { rttMs: 150, throughputKbps: 1.6 * 1024, cpuSlowdownMultiplier: 4 };

export interface SimulatorOptions {
  rtt?: number;
  throughput?: number;
  cpuSlowdownMultiplier?: number;
  layoutTaskMultiplier?: number;
  maximumConcurrentRequests?: number;
  additionalRttByOrigin?: Map<string, number>;
  serverResponseTimeByOrigin?: Map<string, number>;
}

interface NodeTiming {
  startTime: number;
  endTime: number;
  duration: number;
}

export interface SimulationResult {
  timeInMs: number;
  nodeTimings: Map<SimNode, NodeTiming>;
}

export interface SimulateOptions {
  flexibleOrdering?: boolean;
  label?: string;
}

const DEFAULT_MAXIMUM_CONCURRENT_REQUESTS = 10;
const DEFAULT_LAYOUT_TASK_MULTIPLIER = 0.5;
const DEFAULT_MAXIMUM_CPU_TASK_DURATION = 10000;

type NodeState = "notReady" | "ready" | "inProgress" | "complete";

const PriorityStartTimePenalty: Record<SimPriority, number> = {
  VeryHigh: 0,
  High: 0.25,
  Medium: 0.5,
  Low: 1,
  VeryLow: 2,
};

type ResolvedOptions = Required<SimulatorOptions>;

function requestOf(node: SimNode): SimRequest {
  if (!node.request) throw new Error(`Network node ${node.id} has no request`);
  return node.request;
}

class Simulator {
  options: ResolvedOptions;
  rtt: number;
  throughput: number;
  maximumConcurrentRequests: number;
  cpuSlowdownMultiplier: number;
  layoutTaskMultiplier: number;
  cachedNodeListByStartPosition: SimNode[] = [];
  nodeTimings = new SimulatorTimingMap();
  numberInProgressByType = new Map<string, number>();
  nodes: Record<NodeState, Set<SimNode>> = {
    notReady: new Set(),
    ready: new Set(),
    inProgress: new Set(),
    complete: new Set(),
  };
  dns: DNSCache;
  connectionPool!: ConnectionPool;

  constructor(options?: SimulatorOptions) {
    const defaults: ResolvedOptions = {
      rtt: mobileSlow4G.rttMs,
      throughput: mobileSlow4G.throughputKbps * 1024,
      maximumConcurrentRequests: DEFAULT_MAXIMUM_CONCURRENT_REQUESTS,
      cpuSlowdownMultiplier: mobileSlow4G.cpuSlowdownMultiplier,
      layoutTaskMultiplier: DEFAULT_LAYOUT_TASK_MULTIPLIER,
      additionalRttByOrigin: new Map(),
      serverResponseTimeByOrigin: new Map(),
    };
    const defined = Object.fromEntries(
      Object.entries(options ?? {}).filter(([, v]) => v !== undefined),
    );
    this.options = { ...defaults, ...defined };

    this.rtt = this.options.rtt;
    this.throughput = this.options.throughput;
    this.maximumConcurrentRequests = Math.max(
      Math.min(
        TCPConnection.maximumSaturatedConnections(this.rtt, this.throughput),
        this.options.maximumConcurrentRequests,
      ),
      1,
    );
    this.cpuSlowdownMultiplier = this.options.cpuSlowdownMultiplier;
    this.layoutTaskMultiplier = this.cpuSlowdownMultiplier * this.options.layoutTaskMultiplier;
    this.dns = new DNSCache({ rtt: this.rtt });

    if (!Number.isFinite(this.rtt)) throw new Error(`Invalid rtt ${this.rtt}`);
    if (!Number.isFinite(this.throughput)) throw new Error(`Invalid throughput ${this.throughput}`);
  }

  initializeConnectionPool(graph: SimNode): void {
    const records: { request: SimRequest; startTime: number }[] = [];
    graph.getRootNode().traverse((node) => {
      if (node.type === "network" && !node.isConnectionless) {
        records.push({ request: requestOf(node), startTime: node.startTime });
      }
    });
    this.connectionPool = new ConnectionPool(records, this.options);
  }

  initializeAuxiliaryData(): void {
    this.nodeTimings = new SimulatorTimingMap();
    this.numberInProgressByType = new Map();
    this.cachedNodeListByStartPosition = [];
    this.nodes = {
      notReady: new Set(),
      ready: new Set(),
      inProgress: new Set(),
      complete: new Set(),
    };
  }

  numberInProgress(type: string): number {
    return this.numberInProgressByType.get(type) || 0;
  }

  markNodeAsReadyToStart(node: SimNode, queuedTime: number): void {
    const nodeStartPosition = Simulator.computeNodeStartPosition(node);
    const firstGreater = this.cachedNodeListByStartPosition.findIndex(
      (candidate) => Simulator.computeNodeStartPosition(candidate) > nodeStartPosition,
    );
    const insertionIndex =
      firstGreater === -1 ? this.cachedNodeListByStartPosition.length : firstGreater;
    this.cachedNodeListByStartPosition.splice(insertionIndex, 0, node);

    this.nodes.ready.add(node);
    this.nodes.notReady.delete(node);
    this.nodeTimings.setReadyToStart(node, { queuedTime });
  }

  markNodeAsInProgress(node: SimNode, startTime: number): void {
    const index = this.cachedNodeListByStartPosition.indexOf(node);
    this.cachedNodeListByStartPosition.splice(index, 1);

    this.nodes.inProgress.add(node);
    this.nodes.ready.delete(node);
    if (!(node.type === "network" && node.isConnectionless)) {
      this.numberInProgressByType.set(node.type, this.numberInProgress(node.type) + 1);
    }
    this.nodeTimings.setInProgress(node, { startTime });
  }

  markNodeAsComplete(node: SimNode, endTime: number, connectionTiming?: ConnectionTiming): void {
    this.nodes.complete.add(node);
    this.nodes.inProgress.delete(node);
    if (!(node.type === "network" && node.isConnectionless)) {
      this.numberInProgressByType.set(node.type, this.numberInProgress(node.type) - 1);
    }
    this.nodeTimings.setCompleted(node, { endTime, connectionTiming });

    for (const dependent of node.getDependents()) {
      if (dependent.getDependencies().some((dep) => !this.nodes.complete.has(dep))) continue;
      this.markNodeAsReadyToStart(dependent, endTime);
    }
  }

  acquireConnection(request: SimRequest): TCPConnection | null {
    return this.connectionPool.acquire(request);
  }

  getNodesSortedByStartPosition(): SimNode[] {
    return Array.from(this.cachedNodeListByStartPosition);
  }

  startNodeIfPossible(node: SimNode, totalElapsedTime: number): void {
    if (node.type === "cpu") {
      if (this.numberInProgress(node.type) === 0) {
        this.markNodeAsInProgress(node, totalElapsedTime);
      }
      return;
    }

    if (!node.isConnectionless) {
      if (this.numberInProgress(node.type) >= this.maximumConcurrentRequests) return;
      const connection = this.acquireConnection(requestOf(node));
      if (!connection) return;
      if (this.nodeTimings.getQueued(node).queuedTime === totalElapsedTime) {
        connection.setH2OverflowBytesDownloaded(0);
      }
    }

    this.markNodeAsInProgress(node, totalElapsedTime);
  }

  updateNetworkCapacity(): void {
    const inFlight = this.numberInProgress("network");
    if (inFlight === 0) return;

    for (const connection of this.connectionPool.connectionsInUse()) {
      connection.setThroughput(this.throughput / inFlight);
    }
  }

  estimateTimeRemaining(node: SimNode): number {
    return node.type === "cpu"
      ? this.estimateCPUTimeRemaining(node)
      : this.estimateNetworkTimeRemaining(node);
  }

  estimateCPUTimeRemaining(cpuNode: SimNode): number {
    const timingData = this.nodeTimings.getStarted(cpuNode);
    const multiplier = cpuNode.didPerformLayout
      ? this.layoutTaskMultiplier
      : this.cpuSlowdownMultiplier;
    const totalDuration = Math.min(
      Math.round(cpuNode.duration * multiplier),
      DEFAULT_MAXIMUM_CPU_TASK_DURATION,
    );
    const estimatedTimeElapsed = totalDuration - timingData.timeElapsed;
    this.nodeTimings.setEstimated(cpuNode, { estimatedTimeElapsed });
    return estimatedTimeElapsed;
  }

  estimateNetworkTimeRemaining(networkNode: SimNode): number {
    const request = requestOf(networkNode);
    const timingData = this.nodeTimings.getStarted(networkNode);

    let timeElapsed = 0;
    if (networkNode.fromDiskCache) {
      const sizeInMb = (request.resourceSize || 0) / 1024 / 1024;
      timeElapsed = 8 + 20 * sizeInMb - timingData.timeElapsed;
    } else if (networkNode.isNonNetworkProtocol || networkNode.isConnectionless) {
      const sizeInMb = (request.resourceSize || 0) / 1024 / 1024;
      timeElapsed = 2 + 10 * sizeInMb - timingData.timeElapsed;
    } else {
      const connection = this.connectionPool.acquireActiveConnectionFromRequest(request);
      const dnsResolutionTime = this.dns.getTimeUntilResolution(request, {
        requestedAt: timingData.startTime,
        shouldUpdateCache: true,
      });
      const calculation = connection.simulateDownloadUntil(
        request.transferSize - timingData.bytesDownloaded,
        {
          timeAlreadyElapsed: timingData.timeElapsed,
          dnsResolutionTime,
          maximumTimeToElapse: Infinity,
        },
      );
      timeElapsed = calculation.timeElapsed;
    }

    const estimatedTimeElapsed = timeElapsed + timingData.timeElapsedOvershoot;
    this.nodeTimings.setEstimated(networkNode, { estimatedTimeElapsed });
    return estimatedTimeElapsed;
  }

  findNextNodeCompletionTime(): number {
    let minimumTime = Infinity;
    for (const node of this.nodes.inProgress) {
      minimumTime = Math.min(minimumTime, this.estimateTimeRemaining(node));
    }
    return minimumTime;
  }

  updateProgressMadeInTimePeriod(
    node: SimNode,
    timePeriodLength: number,
    totalElapsedTime: number,
  ): void {
    const timingData = this.nodeTimings.getStarted(node);
    const isFinished = timingData.estimatedTimeElapsed === timePeriodLength;

    if (node.type === "cpu" || node.isConnectionless) {
      if (isFinished) {
        this.markNodeAsComplete(node, totalElapsedTime);
      } else {
        timingData.timeElapsed += timePeriodLength;
      }
      return;
    }

    const request = requestOf(node);
    const connection = this.connectionPool.acquireActiveConnectionFromRequest(request);
    const dnsResolutionTime = this.dns.getTimeUntilResolution(request, {
      requestedAt: timingData.startTime,
      shouldUpdateCache: true,
    });
    const bytesToDownload = request.transferSize - timingData.bytesDownloaded;
    const h2OverflowBytesUsed = connection.isMultiplexed()
      ? Math.min(bytesToDownload, connection.h2OverflowBytesDownloaded)
      : 0;
    const calculation = connection.simulateDownloadUntil(bytesToDownload, {
      dnsResolutionTime,
      timeAlreadyElapsed: timingData.timeElapsed,
      maximumTimeToElapse: timePeriodLength - timingData.timeElapsedOvershoot,
    });

    connection.setCongestionWindow(calculation.congestionWindow);
    connection.setH2OverflowBytesDownloaded(calculation.extraBytesDownloaded);

    if (isFinished) {
      connection.setWarmed(true);
      this.connectionPool.release(request);
      this.markNodeAsComplete(node, totalElapsedTime, calculation.connectionTiming);
    } else {
      timingData.timeElapsed += calculation.timeElapsed;
      timingData.timeElapsedOvershoot += calculation.timeElapsed - timePeriodLength;
      timingData.bytesDownloaded += calculation.bytesDownloaded + h2OverflowBytesUsed;
    }
  }

  computeFinalNodeTimings(): Map<SimNode, NodeTiming> {
    const entries: [SimNode, NodeTimingState][] = this.nodeTimings
      .getNodes()
      .map((node) => [node, this.nodeTimings.getCompleted(node)]);
    entries.sort((a, b) => a[1].startTime - b[1].startTime);

    return new Map(
      entries.map(([node, timing]) => [
        node,
        {
          startTime: timing.startTime,
          endTime: timing.endTime,
          duration: timing.endTime - timing.startTime,
        },
      ]),
    );
  }

  simulate(graph: SimNode, _options?: SimulateOptions): SimulationResult {
    if (SimNode.findCycle(graph)) {
      throw new Error("Cannot simulate graph with cycle");
    }

    this.dns = new DNSCache({ rtt: this.rtt });
    this.initializeConnectionPool(graph);
    this.initializeAuxiliaryData();

    const nodesNotReadyToStart = this.nodes.notReady;
    const nodesReadyToStart = this.nodes.ready;
    const nodesInProgress = this.nodes.inProgress;

    const rootNode = graph.getRootNode();
    rootNode.traverse((node) => nodesNotReadyToStart.add(node));
    let totalElapsedTime = 0;
    let iteration = 0;

    this.markNodeAsReadyToStart(rootNode, totalElapsedTime);

    while (nodesReadyToStart.size || nodesInProgress.size) {
      for (const node of this.getNodesSortedByStartPosition()) {
        this.startNodeIfPossible(node, totalElapsedTime);
      }

      if (!nodesInProgress.size) {
        throw new Error("Failed to start a node");
      }

      this.updateNetworkCapacity();

      const minimumTime = this.findNextNodeCompletionTime();
      totalElapsedTime += minimumTime;

      if (!Number.isFinite(minimumTime) || iteration > 100000) {
        throw new Error("Simulation failed, depth exceeded");
      }

      iteration++;
      for (const node of nodesInProgress) {
        this.updateProgressMadeInTimePeriod(node, minimumTime, totalElapsedTime);
      }
    }

    return { timeInMs: totalElapsedTime, nodeTimings: this.computeFinalNodeTimings() };
  }

  static computeNodeStartPosition(node: SimNode): number {
    if (node.type === "cpu" || !node.request) return node.startTime;
    return node.startTime + (PriorityStartTimePenalty[node.request.priority] * 1000 || 0);
  }
}

export function simulate(
  root: SimNode,
  options: SimulatorOptions,
  simOpts?: SimulateOptions,
): SimulationResult {
  return new Simulator(options).simulate(root, simOpts);
}

