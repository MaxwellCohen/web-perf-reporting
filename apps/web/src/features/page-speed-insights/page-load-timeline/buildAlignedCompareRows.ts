import type { TimelineEvent } from "./types";

export type AlignedCompareRow = {
  /** Representative clock time for sorting / display (earliest side). */
  timeMs: number;
  leftTimeMs?: number;
  rightTimeMs?: number;
  left: TimelineEvent[];
  right: TimelineEvent[];
};

/**
 * Snap to the same precision as `formatMs` so labels like "1.32 s" read the same
 * even when raw ms differ slightly (e.g. 1316 vs 1324).
 */
export function alignTimeBucketMs(timeMs: number): number {
  if (!Number.isFinite(timeMs)) return 0;
  const abs = Math.abs(timeMs);
  if (abs < 1000) return Math.round(timeMs);
  if (abs >= 10000) return Math.round(timeMs / 100) * 100;
  return Math.round(timeMs / 10) * 10;
}

/** Same step across runs: ids minus their per-run index (`net-3` → `net`). */
export function compareMatchKey(event: TimelineEvent): string {
  return `${event.phaseId}:${event.id.replace(/-\d+$/, "")}`;
}

function byTime(events: TimelineEvent[]): TimelineEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.timeMs - b.event.timeMs || a.index - b.index)
    .map(({ event }) => event);
}

function rowFor(left?: TimelineEvent, right?: TimelineEvent): AlignedCompareRow {
  const leftTimeMs = left ? alignTimeBucketMs(left.timeMs) : undefined;
  const rightTimeMs = right ? alignTimeBucketMs(right.timeMs) : undefined;
  return {
    timeMs: Math.min(leftTimeMs ?? Infinity, rightTimeMs ?? Infinity),
    leftTimeMs,
    rightTimeMs,
    left: left ? [left] : [],
    right: right ? [right] : [],
  };
}

/**
 * Line up two timelines by step rather than by clock: the same event in both
 * runs (e.g. Preconnect at 20 ms vs 130 ms) shares a row, and each side keeps
 * its own time order. Uses a longest common subsequence over match keys.
 */
export function buildAlignedCompareRows(
  left: TimelineEvent[],
  right: TimelineEvent[],
): AlignedCompareRow[] {
  const a = byTime(left);
  const b = byTime(right);
  const aKeys = a.map(compareMatchKey);
  const bKeys = b.map(compareMatchKey);

  // lcs[i][j] = LCS length of a[i..] and b[j..]
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] =
        aKeys[i] === bKeys[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const rows: AlignedCompareRow[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && aKeys[i] === bKeys[j]) {
      rows.push(rowFor(a[i++], b[j++]));
    } else if (j >= b.length || (i < a.length && lcs[i + 1][j] >= lcs[i][j + 1])) {
      // Skipping either side keeps the same match count; emit the earlier one first.
      if (j < b.length && lcs[i + 1][j] === lcs[i][j + 1] && b[j].timeMs < a[i].timeMs) {
        rows.push(rowFor(undefined, b[j++]));
      } else {
        rows.push(rowFor(a[i++], undefined));
      }
    } else {
      rows.push(rowFor(undefined, b[j++]));
    }
  }

  return rows;
}
