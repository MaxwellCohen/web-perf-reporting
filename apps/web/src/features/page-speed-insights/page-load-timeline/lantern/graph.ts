// Minimal dependency graph for the Lantern simulator port (all times in ms).

export type SimPriority = "VeryHigh" | "High" | "Medium" | "Low" | "VeryLow";

export interface SimRequest {
  url: string;
  origin: string;
  protocol: string;
  resourceType: string;
  priority: SimPriority;
  transferSize: number;
  resourceSize: number;
  isConnectionless?: boolean;
  fromDiskCache?: boolean;
  isMainDocument?: boolean;
  connectionId?: string;
  connectionReused?: boolean;
}

export interface SimNodeInit {
  id: string;
  type: "network" | "cpu";
  startTime?: number;
  endTime?: number;
  duration?: number;
  request?: SimRequest;
  didPerformLayout?: boolean;
}

const NON_NETWORK_SCHEMES = ["blob", "data", "intent", "file", "filesystem", "chrome-extension"];

export function isNonNetworkProtocol(protocol: string): boolean {
  const scheme = protocol.includes(":") ? protocol.slice(0, protocol.indexOf(":")) : protocol;
  return NON_NETWORK_SCHEMES.includes(scheme);
}

export class SimNode {
  id: string;
  type: "network" | "cpu";
  startTime: number;
  endTime: number;
  duration: number;
  request?: SimRequest;
  didPerformLayout: boolean;
  dependents: SimNode[] = [];
  dependencies: SimNode[] = [];

  constructor(init: SimNodeInit) {
    this.id = init.id;
    this.type = init.type;
    this.startTime = init.startTime ?? 0;
    this.endTime = init.endTime ?? this.startTime + (init.duration ?? 0);
    this.duration = init.duration ?? this.endTime - this.startTime;
    this.request = init.request;
    this.didPerformLayout = init.didPerformLayout ?? false;
  }

  get fromDiskCache(): boolean {
    return Boolean(this.request?.fromDiskCache);
  }

  get isNonNetworkProtocol(): boolean {
    if (!this.request) return false;
    let scheme = "";
    try {
      scheme = new URL(this.request.url).protocol;
    } catch {
      // ignore
    }
    return isNonNetworkProtocol(this.request.protocol) || isNonNetworkProtocol(scheme);
  }

  get isConnectionless(): boolean {
    return (
      Boolean(this.request?.isConnectionless) || this.fromDiskCache || this.isNonNetworkProtocol
    );
  }

  isMainDocument(): boolean {
    return Boolean(this.request?.isMainDocument);
  }

  getDependents(): SimNode[] {
    return this.dependents.slice();
  }

  getDependencies(): SimNode[] {
    return this.dependencies.slice();
  }

  getRootNode(): SimNode {
    let rootNode: SimNode = this;
    while (rootNode.dependencies.length) {
      rootNode = rootNode.dependencies[0];
    }
    return rootNode;
  }

  addDependent(node: SimNode): void {
    node.addDependency(this);
  }

  addDependency(node: SimNode): void {
    if (node === this) throw new Error("Cannot add dependency on itself");
    if (this.dependencies.includes(node)) return;
    node.dependents.push(this);
    this.dependencies.push(node);
  }

  removeDependent(node: SimNode): void {
    node.removeDependency(this);
  }

  removeDependency(node: SimNode): void {
    if (!this.dependencies.includes(node)) return;
    node.dependents.splice(node.dependents.indexOf(this), 1);
    this.dependencies.splice(this.dependencies.indexOf(node), 1);
  }

  removeAllDependencies(): void {
    for (const node of this.dependencies.slice()) {
      this.removeDependency(node);
    }
  }

  isDependentOn(node: SimNode): boolean {
    let isDependentOnNode = false;
    this.traverse(
      (currentNode) => {
        if (isDependentOnNode) return;
        isDependentOnNode = currentNode === node;
      },
      (currentNode) => (isDependentOnNode ? [] : currentNode.getDependencies()),
    );
    return isDependentOnNode;
  }

  cloneWithoutRelationships(): SimNode {
    return new SimNode({
      id: this.id,
      type: this.type,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.duration,
      request: this.request,
      didPerformLayout: this.didPerformLayout,
    });
  }

  cloneWithRelationships(keep?: (node: SimNode) => boolean): SimNode {
    const rootNode = this.getRootNode();
    const idsToIncludedClones = new Map<string, SimNode>();

    rootNode.traverse((node) => {
      if (idsToIncludedClones.has(node.id)) return;

      if (keep === undefined) {
        idsToIncludedClones.set(node.id, node.cloneWithoutRelationships());
        return;
      }

      if (keep(node)) {
        node.traverse(
          (n) => idsToIncludedClones.set(n.id, n.cloneWithoutRelationships()),
          (n) => n.dependencies.filter((parent) => !idsToIncludedClones.has(parent.id)),
        );
      }
    });

    rootNode.traverse((originalNode) => {
      const clonedNode = idsToIncludedClones.get(originalNode.id);
      if (!clonedNode) return;

      for (const dependency of originalNode.dependencies) {
        const clonedDependency = idsToIncludedClones.get(dependency.id);
        if (!clonedDependency) throw new Error("Dependency somehow not cloned");
        clonedNode.addDependency(clonedDependency);
      }
    });

    const clonedThisNode = idsToIncludedClones.get(this.id);
    if (!clonedThisNode) throw new Error("Cloned graph missing node");
    return clonedThisNode;
  }

  traverse(
    callback: (node: SimNode, traversalPath: SimNode[]) => void,
    getNextNodes?: (node: SimNode) => SimNode[],
  ): void {
    const next = getNextNodes ?? ((node: SimNode) => node.getDependents());
    const queue: SimNode[][] = [[this]];
    const visited = new Set([this.id]);

    while (queue.length) {
      const traversalPath = queue.shift() as SimNode[];
      const node = traversalPath[0];
      callback(node, traversalPath);

      for (const nextNode of next(node)) {
        if (visited.has(nextNode.id)) continue;
        visited.add(nextNode.id);
        queue.push([nextNode, ...traversalPath]);
      }
    }
  }

  static findCycle(
    node: SimNode,
    direction: "dependents" | "dependencies" | "both" = "both",
  ): SimNode[] | null {
    if (direction === "both") {
      return SimNode.findCycle(node, "dependents") || SimNode.findCycle(node, "dependencies");
    }

    const visited = new Set<SimNode>();
    const currentPath: SimNode[] = [];
    const toVisit = [node];
    const depthAdded = new Map([[node, 0]]);

    while (toVisit.length) {
      const currentNode = toVisit.pop() as SimNode;

      if (currentPath.includes(currentNode)) return currentPath;
      if (visited.has(currentNode)) continue;

      while (currentPath.length > (depthAdded.get(currentNode) ?? 0)) {
        currentPath.pop();
      }

      visited.add(currentNode);
      currentPath.push(currentNode);

      const nodesToExplore =
        direction === "dependents" ? currentNode.dependents : currentNode.dependencies;
      for (const nextNode of nodesToExplore) {
        if (toVisit.includes(nextNode)) continue;
        toVisit.push(nextNode);
        depthAdded.set(nextNode, currentPath.length);
      }
    }

    return null;
  }
}
