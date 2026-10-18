import type { TimelineEvent } from "./types";

export type MomentInterval = {
  startMs: number;
  endMs: number;
};

export type TimelineCluster =
  | { kind: "single"; event: TimelineEvent }
  | { kind: "parallel"; events: TimelineEvent[]; startMs: number; endMs: number };

/** Wall-clock range for a moment. Point markers use `[timeMs, timeMs]`. */
export function momentInterval(event: TimelineEvent): MomentInterval {
  const startMs = event.startMs ?? event.timeMs;
  const endMs = event.endMs ?? event.timeMs;
  return { startMs, endMs };
}

export function isIntervalMoment(event: TimelineEvent): boolean {
  const { startMs, endMs } = momentInterval(event);
  return endMs > startMs;
}

function rangesOverlap(a: MomentInterval, b: MomentInterval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

/**
 * Groups overlapping interval moments into parallel clusters; point markers stay singles.
 * Preserves encounter order from the input list (typically sorted by end / `timeMs`).
 */
export function clusterOverlappingMoments(events: TimelineEvent[]): TimelineCluster[] {
  const intervalIndices: number[] = [];
  for (let i = 0; i < events.length; i++) {
    if (isIntervalMoment(events[i]!)) intervalIndices.push(i);
  }

  const parent = intervalIndices.map((_, i) => i);
  function find(i: number): number {
    let root = i;
    while (parent[root] !== root) root = parent[root]!;
    let cursor = i;
    while (parent[cursor] !== root) {
      const next = parent[cursor]!;
      parent[cursor] = root;
      cursor = next;
    }
    return root;
  }
  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  }

  for (let i = 0; i < intervalIndices.length; i++) {
    const a = momentInterval(events[intervalIndices[i]!]!);
    for (let j = i + 1; j < intervalIndices.length; j++) {
      const b = momentInterval(events[intervalIndices[j]!]!);
      if (rangesOverlap(a, b)) union(i, j);
    }
  }

  const membersByRoot = new Map<number, number[]>();
  for (let i = 0; i < intervalIndices.length; i++) {
    const root = find(i);
    const list = membersByRoot.get(root) ?? [];
    list.push(intervalIndices[i]!);
    membersByRoot.set(root, list);
  }

  const clusterForIndex = new Map<number, number[]>();
  for (const members of membersByRoot.values()) {
    for (const index of members) clusterForIndex.set(index, members);
  }

  const emitted = new Set<number>();
  const result: TimelineCluster[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i]!;
    if (!isIntervalMoment(event)) {
      result.push({ kind: "single", event });
      continue;
    }

    const members = clusterForIndex.get(i);
    if (!members || members.length <= 1) {
      result.push({ kind: "single", event });
      continue;
    }

    if (emitted.has(members[0]!)) continue;
    for (const index of members) emitted.add(index);

    const clustered = members
      .map((index) => events[index]!)
      .sort((a, b) => {
        const aStart = momentInterval(a).startMs;
        const bStart = momentInterval(b).startMs;
        return aStart - bStart || a.timeMs - b.timeMs;
      });

    let startMs = Infinity;
    let endMs = -Infinity;
    for (const member of clustered) {
      const range = momentInterval(member);
      startMs = Math.min(startMs, range.startMs);
      endMs = Math.max(endMs, range.endMs);
    }

    result.push({ kind: "parallel", events: clustered, startMs, endMs });
  }

  return result;
}
