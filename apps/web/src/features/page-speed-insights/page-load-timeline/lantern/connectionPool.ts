// Port of Lighthouse Lantern ConnectionPool (times in ms).

import type { SimRequest } from "./graph";
import { TCPConnection } from "./tcpConnection";

export const DEFAULT_SERVER_RESPONSE_TIME = 30;
const TLS_SCHEMES = ["https:", "wss:"];
const CONNECTIONS_PER_ORIGIN = 6;

export interface ConnectionPoolOptions {
  rtt: number;
  throughput: number;
  additionalRttByOrigin: Map<string, number>;
  serverResponseTimeByOrigin: Map<string, number>;
}

export interface PoolRecord {
  request: SimRequest;
  startTime: number;
}

export function isMultiplexedProtocol(protocol: string): boolean {
  return protocol === "h2" || protocol === "h3" || protocol.startsWith("h3-");
}

function schemeOf(url: string): string {
  try {
    return new URL(url).protocol;
  } catch {
    return "https:";
  }
}

export class ConnectionPool {
  connectionsByOrigin = new Map<string, TCPConnection[]>();
  connectionsByRequest = new Map<SimRequest, TCPConnection>();
  connectionsInUseSet = new Set<TCPConnection>();

  constructor(
    public records: PoolRecord[],
    public options: ConnectionPoolOptions,
  ) {
    this.initializeConnections();
  }

  connectionsInUse(): TCPConnection[] {
    return Array.from(this.connectionsInUseSet);
  }

  initializeConnections(): void {
    const byOrigin = new Map<string, PoolRecord[]>();
    for (const record of this.records) {
      const list = byOrigin.get(record.request.origin) ?? [];
      list.push(record);
      byOrigin.set(record.request.origin, list);
    }

    for (const [origin, records] of byOrigin) {
      const connections: TCPConnection[] = [];
      const additionalRtt = this.options.additionalRttByOrigin.get(origin) || 0;
      const responseTime =
        this.options.serverResponseTimeByOrigin.get(origin) || DEFAULT_SERVER_RESPONSE_TIME;

      // Coarse connection reuse estimate: the earliest request per origin opens the connection.
      const sorted = [...records].sort((a, b) => a.startTime - b.startTime);
      const first = sorted[0].request;
      const isTLS = TLS_SCHEMES.includes(schemeOf(first.url));
      connections.push(
        new TCPConnection(
          this.options.rtt + additionalRtt,
          this.options.throughput,
          responseTime,
          isTLS,
          isMultiplexedProtocol(first.protocol),
        ),
      );

      // Like Lantern, one connection per observed connection. Requests flagged
      // `connectionReused === false` each opened one.
      const opened = records.filter((r) => r.request.connectionReused === false).length;
      const minConnections =
        opened > 0 ? opened : connections[0].isMultiplexed() ? 1 : CONNECTIONS_PER_ORIGIN;
      while (connections.length < minConnections) {
        connections.push(connections[0].clone());
      }

      this.connectionsByOrigin.set(origin, connections);
    }
  }

  findAvailableConnectionWithLargestCongestionWindow(
    connections: TCPConnection[],
  ): TCPConnection | null {
    let maxConnection: TCPConnection | null = null;
    for (const connection of connections) {
      if (this.connectionsInUseSet.has(connection)) continue;
      const currentMax = maxConnection?.congestionWindow || -Infinity;
      if (connection.congestionWindow > currentMax) {
        maxConnection = connection;
      }
    }
    return maxConnection;
  }

  acquire(request: SimRequest): TCPConnection | null {
    if (this.connectionsByRequest.has(request)) {
      throw new Error("Record already has a connection");
    }

    const connections = this.connectionsByOrigin.get(request.origin) || [];
    const connectionToUse = this.findAvailableConnectionWithLargestCongestionWindow(connections);
    if (!connectionToUse) return null;

    this.connectionsInUseSet.add(connectionToUse);
    this.connectionsByRequest.set(request, connectionToUse);
    return connectionToUse;
  }

  acquireActiveConnectionFromRequest(request: SimRequest): TCPConnection {
    const activeConnection = this.connectionsByRequest.get(request);
    if (!activeConnection) {
      throw new Error("Could not find an active connection for request");
    }
    return activeConnection;
  }

  release(request: SimRequest): void {
    const connection = this.connectionsByRequest.get(request);
    this.connectionsByRequest.delete(request);
    if (connection) {
      this.connectionsInUseSet.delete(connection);
    }
  }
}
