import { adjustLcpSubparts } from "@/features/page-speed-insights/page-load-timeline/simulatedThrottling";
import { getNumber } from "@/lib/utils";

type AuditsLike = Record<string, unknown>;
type Row = Record<string, unknown>;

const cache = new WeakMap<object, AuditsLike>();

/**
 * Lighthouse's `lcp-breakdown-insight` holds observed timings, while the reported LCP is
 * simulated. Returns audits whose breakdown table sums to the reported LCP; every consumer
 * of LCP subparts should read through this.
 */
export function reconcileLcpAudits<T extends AuditsLike | undefined>(
  audits: T,
): T {
  if (!audits) return audits;
  const cached = cache.get(audits);
  if (cached) return cached as T;

  const result = reconcile(audits);
  cache.set(audits, result);
  return result as T;
}

function reconcile(audits: AuditsLike): AuditsLike {
  const audit = audits["lcp-breakdown-insight"] as
    | { details?: { items?: Array<{ type?: string; items?: Row[] }> } }
    | undefined;
  const tableIndex =
    audit?.details?.items?.findIndex((item) => item?.type === "table") ?? -1;
  const table = audit?.details?.items?.[tableIndex];
  if (!audit?.details?.items || !table?.items?.length) return audits;

  const metrics = (
    audits.metrics as
      { details?: { items?: Array<Record<string, unknown>> } } | undefined
  )?.details?.items?.[0];
  const simulatedLcp = getNumber(metrics?.largestContentfulPaint);
  if (!metrics || !(simulatedLcp && simulatedLcp > 0)) return audits;

  const observed = table.items.map((row) => ({
    subpart: typeof row.subpart === "string" ? row.subpart : "",
    label: typeof row.label === "string" ? row.label : "",
    duration: getNumber(row.duration) || 0,
  }));
  const total = observed.reduce((sum, part) => sum + part.duration, 0);
  if (Math.abs(total - simulatedLcp) < 1) return audits;

  const adjusted = adjustLcpSubparts(observed, {
    simulatedTtfb: getNumber(metrics.timeToFirstByte),
    simulatedLcp,
    loadDelay: getNumber(metrics.lcpLoadDelay),
    loadDuration: getNumber(metrics.lcpLoadDuration),
  });
  const byId = new Map(adjusted.map((part) => [part.subpart, part]));
  const items = [...audit.details.items];
  items[tableIndex] = {
    ...table,
    items:
      adjusted.length === table.items.length
        ? table.items.map((row) => ({
            ...row,
            duration: byId.get(String(row.subpart))?.duration ?? row.duration,
          }))
        : adjusted,
  };
  return {
    ...audits,
    "lcp-breakdown-insight": { ...audit, details: { ...audit.details, items } },
  };
}
