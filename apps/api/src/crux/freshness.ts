export const HISTORY_FRESH_MS = 8 * 24 * 60 * 60 * 1000;
export const CURRENT_CACHE_SECONDS = 86_400;

/** Drizzle timestamp columns come back as Dates. Raw SQLite dumps may be unix seconds. */
export function newestToMs(value: Date | number | null | undefined): number | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }
  if (!Number.isFinite(value)) return null;
  if (value < 1_000_000_000_000) return value * 1000;
  return value;
}

export function isHistoryFresh(newest: Date | number | null | undefined, nowMs: number): boolean {
  const newestMs = newestToMs(newest);
  if (newestMs == null) return false;
  return nowMs - newestMs <= HISTORY_FRESH_MS;
}
