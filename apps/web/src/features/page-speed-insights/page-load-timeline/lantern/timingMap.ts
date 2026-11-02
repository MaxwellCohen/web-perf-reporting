// Simplified port of Lighthouse Lantern SimulatorTimingMap (times in ms).

import type { SimNode } from "./graph";
import type { ConnectionTiming } from "./tcpConnection";

export interface NodeTimingState {
  queuedTime: number;
  startTime: number;
  endTime: number;
  estimatedTimeElapsed: number;
  timeElapsed: number;
  timeElapsedOvershoot: number;
  bytesDownloaded: number;
  connectionTiming?: ConnectionTiming;
  stage: "queued" | "started" | "completed";
}

export class SimulatorTimingMap {
  nodeTimings = new Map<SimNode, NodeTimingState>();

  getNodes(): SimNode[] {
    return Array.from(this.nodeTimings.keys());
  }

  setReadyToStart(node: SimNode, values: { queuedTime: number }): void {
    this.nodeTimings.set(node, {
      queuedTime: values.queuedTime,
      startTime: 0,
      endTime: 0,
      estimatedTimeElapsed: 0,
      timeElapsed: 0,
      timeElapsedOvershoot: 0,
      bytesDownloaded: 0,
      stage: "queued",
    });
  }

  setInProgress(node: SimNode, values: { startTime: number }): void {
    const timing = this.getQueued(node);
    timing.startTime = values.startTime;
    timing.timeElapsed = 0;
    timing.timeElapsedOvershoot = 0;
    timing.bytesDownloaded = 0;
    timing.stage = "started";
  }

  setCompleted(
    node: SimNode,
    values: { endTime: number; connectionTiming?: ConnectionTiming },
  ): void {
    const timing = this.getStarted(node);
    timing.endTime = values.endTime;
    timing.connectionTiming = values.connectionTiming;
    timing.stage = "completed";
  }

  setEstimated(node: SimNode, values: { estimatedTimeElapsed: number }): void {
    this.getStarted(node).estimatedTimeElapsed = values.estimatedTimeElapsed;
  }

  getQueued(node: SimNode): NodeTimingState {
    const timing = this.nodeTimings.get(node);
    if (!timing) throw new Error(`Node ${node.id} not yet queued`);
    return timing;
  }

  getStarted(node: SimNode): NodeTimingState {
    const timing = this.getQueued(node);
    if (timing.stage === "queued") throw new Error(`Node ${node.id} not yet started`);
    return timing;
  }

  getCompleted(node: SimNode): NodeTimingState {
    const timing = this.getStarted(node);
    if (timing.stage !== "completed") throw new Error(`Node ${node.id} not yet completed`);
    return timing;
  }
}
