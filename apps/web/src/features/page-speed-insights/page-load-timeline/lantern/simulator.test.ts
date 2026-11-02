import { describe, expect, it } from "vitest";
import { SimNode, type SimRequest } from "./graph";
import { mobileSlow4G, simulate, type SimulatorOptions } from "./simulator";

const opts: SimulatorOptions = {
  rtt: mobileSlow4G.rttMs,
  throughput: mobileSlow4G.throughputKbps * 1024,
  cpuSlowdownMultiplier: mobileSlow4G.cpuSlowdownMultiplier,
};

function req(path: string, size: number, protocol = "h2"): SimRequest {
  return {
    url: `https://example.com/${path}`,
    origin: "https://example.com",
    protocol,
    resourceType: "Other",
    priority: "High",
    transferSize: size,
    resourceSize: size,
  };
}

function net(id: string, size: number, startTime = 0, protocol = "h2"): SimNode {
  return new SimNode({ id, type: "network", startTime, request: req(id, size, protocol) });
}

function cpu(id: string, duration: number): SimNode {
  return new SimNode({ id, type: "cpu", startTime: 0, duration });
}

describe("lantern simulator", () => {
  it("is faster on a warm connection than a cold one", () => {
    const cold = net("a", 100_000);
    const coldRes = simulate(cold, opts);
    const coldDuration = coldRes.nodeTimings.get(cold)!.duration;

    const first = net("a", 100_000);
    const second = net("b", 100_000, 1);
    second.addDependency(first);
    const warmRes = simulate(first, opts);
    expect(warmRes.nodeTimings.get(second)!.duration).toBeLessThan(coldDuration);
  });

  it("slows concurrent requests sharing bandwidth", () => {
    const solo = net("a", 500_000, 0, "http/1.1");
    const soloDuration = simulate(solo, opts).nodeTimings.get(solo)!.duration;

    const root = cpu("root", 0);
    const a = net("a", 500_000, 0, "http/1.1");
    const b = net("b", 500_000, 0, "http/1.1");
    a.addDependency(root);
    b.addDependency(root);
    const res = simulate(root, opts);
    expect(res.nodeTimings.get(a)!.duration).toBeGreaterThan(soloDuration);
    expect(res.nodeTimings.get(b)!.duration).toBeGreaterThan(soloDuration);
  });

  it("applies cpu slowdown", () => {
    const node = cpu("c", 100);
    const res = simulate(node, opts);
    expect(res.nodeTimings.get(node)!.duration).toBe(400);
    expect(res.timeInMs).toBe(400);
  });

  it("starts children after parents end", () => {
    const parent = net("p", 50_000);
    const child = net("c", 50_000);
    child.addDependency(parent);
    const res = simulate(parent, opts);
    expect(res.nodeTimings.get(child)!.startTime).toBeGreaterThanOrEqual(
      res.nodeTimings.get(parent)!.endTime,
    );
  });

  it("cloneWithRelationships keeps the ancestors of kept nodes", () => {
    const a = cpu("A", 1);
    const b = cpu("B", 1);
    const c = cpu("C", 1);
    const d = cpu("D", 1);
    b.addDependency(a);
    c.addDependency(b);
    d.addDependency(a);
    const clone = c.cloneWithRelationships((n) => n.id === "C");
    const root = clone.getRootNode();
    expect(root.id).toBe("A");
    expect(root.getDependents().map((n) => n.id)).toEqual(["B"]);
    expect(clone.getDependencies().map((n) => n.id)).toEqual(["B"]);
  });
});
