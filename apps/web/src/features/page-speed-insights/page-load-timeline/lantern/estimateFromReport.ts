/** Runs the Lantern-style FCP/LCP estimate on a Lighthouse result's audits. */
import {
  estimateMetrics,
  type LanternEstimate,
  type LanternThrottlingInput,
} from "./lanternMetrics";

type Row = Record<string, unknown>;
type Audits = Record<
  string,
  { numericValue?: number; details?: { items?: unknown[] } } | undefined
>;

const MOBILE: LanternThrottlingInput = {
  rttMs: 150,
  throughputKbps: 1.6 * 1024,
  cpuSlowdownMultiplier: 4,
};
const DESKTOP: LanternThrottlingInput = {
  rttMs: 40,
  throughputKbps: 10 * 1024,
  cpuSlowdownMultiplier: 1,
};

const num = (value: unknown, fallback = 0) => (typeof value === "number" ? value : fallback);
const rows = (audits: Audits, id: string) => (audits[id]?.details?.items ?? []) as Row[];

export type ReportEstimate = {
  estimate: LanternEstimate;
  /** Lighthouse's own simulated values, for comparison. */
  lighthouse: { fcp: number; lcp: number };
};

export function estimateFromAudits(audits: Audits, formFactor: string): ReportEstimate | null {
  const metrics = rows(audits, "metrics")[0];
  const observedFcp = metrics?.observedFirstContentfulPaint;
  if (!metrics || typeof observedFcp !== "number") return null;

  const requests = rows(audits, "network-requests")
    .filter((r) => typeof r.networkRequestTime === "number" && typeof r.networkEndTime === "number")
    .map((r) => ({
      url: String(r.url),
      startMs: num(r.networkRequestTime),
      rendererStartMs: typeof r.rendererStartTime === "number" ? r.rendererStartTime : undefined,
      endMs: num(r.networkEndTime),
      transferSize: num(r.transferSize),
      resourceSize: num(r.resourceSize),
      protocol: typeof r.protocol === "string" ? r.protocol : "h2",
      resourceType: typeof r.resourceType === "string" ? r.resourceType : "Other",
      priority: typeof r.priority === "string" ? r.priority : "Medium",
    }));
  const tasks = rows(audits, "main-thread-tasks").map((t) => ({
    startMs: num(t.startTime),
    durationMs: num(t.duration),
  }));
  const blockingRows = audits["render-blocking-insight"]?.details?.items;
  const renderBlockingUrls = blockingRows
    ? new Set((blockingRows as Row[]).map((r) => String(r.url)))
    : undefined;
  const lcpIsText = !JSON.stringify(audits["lcp-breakdown-insight"]?.details ?? {}).includes(
    "resourceLoad",
  );

  const estimate = estimateMetrics(
    {
      requests,
      tasks,
      documentServerResponseMs: audits["server-response-time"]?.numericValue,
      renderBlockingUrls,
    },
    formFactor === "desktop" ? DESKTOP : MOBILE,
    {
      fcpMs: observedFcp,
      lcpMs:
        typeof metrics.observedLargestContentfulPaint === "number"
          ? metrics.observedLargestContentfulPaint
          : undefined,
      lcpIsText,
    },
  );
  return {
    estimate,
    lighthouse: {
      fcp: num(metrics.firstContentfulPaint),
      lcp: num(metrics.largestContentfulPaint),
    },
  };
}
