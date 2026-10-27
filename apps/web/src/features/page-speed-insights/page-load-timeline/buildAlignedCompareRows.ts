import { formatMs } from "@/features/page-speed-insights/shared/format";
import type { TimelineEvent } from "./types";

export type AlignedCompareRow = {
  /** Representative clock time for sorting / display (min in the bucket). */
  timeMs: number;
  left: TimelineEvent[];
  right: TimelineEvent[];
};

/**
 * Snap to the same precision as `formatMs` so labels like "1.32 s" share a row
 * even when raw ms differ slightly (e.g. 1316 vs 1324).
 */
export function alignTimeBucketMs(timeMs: number): number {
  if (!Number.isFinite(timeMs)) return 0;
  const abs = Math.abs(timeMs);
  if (abs < 1000) return Math.round(timeMs);
  if (abs >= 10000) return Math.round(timeMs / 100) * 100;
  return Math.round(timeMs / 10) * 10;
}

/**
 * Merge two timelines onto a shared clock. Events that display as the same
 * formatted time (and fall in the same snap bucket) share one row.
 */
export function buildAlignedCompareRows(
  left: TimelineEvent[],
  right: TimelineEvent[],
): AlignedCompareRow[] {
  const map = new Map<string, AlignedCompareRow>();

  function slot(timeMs: number): AlignedCompareRow {
    const raw = Number.isFinite(timeMs) ? timeMs : 0;
    const bucket = alignTimeBucketMs(raw);
    // Key by display label so 1316 + 1324 both under "1.32 s".
    const key = formatMs(bucket);
    let row = map.get(key);
    if (!row) {
      row = { timeMs: bucket, left: [], right: [] };
      map.set(key, row);
    } else {
      row.timeMs = Math.min(row.timeMs, bucket);
    }
    return row;
  }

  for (const event of left) slot(event.timeMs).left.push(event);
  for (const event of right) slot(event.timeMs).right.push(event);

  return [...map.values()].sort((a, b) => a.timeMs - b.timeMs || a.left.length - b.left.length);
}