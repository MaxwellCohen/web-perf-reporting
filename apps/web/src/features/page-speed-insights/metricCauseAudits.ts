import type { AuditResult, AuditResultsRecord } from "@/lib/schema";

const CWV_METRIC_ACRONYMS = ["FCP", "LCP", "TBT", "CLS", "SI"] as const;
export type CwvMetricAcronym = (typeof CWV_METRIC_ACRONYMS)[number];

export const METRIC_AUDIT_IDS = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
] as const;

export type MetricAuditId = (typeof METRIC_AUDIT_IDS)[number];

export const METRIC_AUDIT_TO_ACRONYM: Record<MetricAuditId, CwvMetricAcronym> = {
  "first-contentful-paint": "FCP",
  "largest-contentful-paint": "LCP",
  "total-blocking-time": "TBT",
  "cumulative-layout-shift": "CLS",
  "speed-index": "SI",
};

/** Insights / diagnostics that explain a metric even when estimated savings are 0. */
export const CURATED_CAUSE_AUDIT_IDS: Record<MetricAuditId, readonly string[]> = {
  "first-contentful-paint": [
    "document-latency-insight",
    "render-blocking-insight",
    "font-display-insight",
    "network-dependency-tree-insight",
  ],
  "largest-contentful-paint": [
    "lcp-breakdown-insight",
    "lcp-discovery-insight",
    "image-delivery-insight",
    "render-blocking-insight",
  ],
  "total-blocking-time": [
    "bootup-time",
    "mainthread-work-breakdown",
    "main-thread-tasks",
    "third-parties-insight",
    "unused-javascript",
    "legacy-javascript",
  ],
  "cumulative-layout-shift": ["cls-culprits-insight", "layout-shifts", "unsized-images"],
  "speed-index": ["render-blocking-insight", "unused-css-rules", "font-display-insight"],
};

export type MetricAuditSource = {
  audits: AuditResultsRecord;
  label: string;
};

export type CauseAuditEntry = {
  auditId: string;
  title: string;
  description?: string;
  /** Per-report audit instances that have details. */
  entries: Array<{ audit: AuditResult; label: string }>;
  /** Max savings for this metric acronym across reports (ms or CLS units). */
  maxSavings: number;
};

function isApplicable(audit: AuditResult): boolean {
  const mode = audit.scoreDisplayMode?.toLowerCase();
  return mode !== "notapplicable" && mode !== "manual";
}

function hasDetails(audit: AuditResult): boolean {
  return !!audit.details;
}

function maxSavingsForAcronym(
  entries: Array<{ audit: AuditResult }>,
  acronym: CwvMetricAcronym,
): number {
  return entries.reduce((max, { audit }) => {
    const savings = audit.metricSavings?.[acronym] ?? 0;
    return Math.max(max, savings);
  }, 0);
}

/**
 * Collect cause audits for a CWV metric from one or more report audit maps.
 * Includes curated insight/diagnostic ids (even at 0 savings) and any other
 * audit with metricSavings[acronym] > 0. Skips notApplicable and audits with no details.
 */
export function collectCauseAuditsForMetric(
  metricId: MetricAuditId,
  sources: MetricAuditSource[],
): CauseAuditEntry[] {
  const acronym = METRIC_AUDIT_TO_ACRONYM[metricId];
  const curated = new Set(CURATED_CAUSE_AUDIT_IDS[metricId]);
  const byAuditId = new Map<string, Array<{ audit: AuditResult; label: string }>>();

  for (const { audits, label } of sources) {
    for (const [auditId, audit] of Object.entries(audits)) {
      if (!audit || !isApplicable(audit) || !hasDetails(audit)) {
        continue;
      }

      const savings = audit.metricSavings?.[acronym] ?? 0;
      const isCurated = curated.has(auditId);
      if (!isCurated && !(savings > 0)) {
        continue;
      }

      const list = byAuditId.get(auditId) ?? [];
      list.push({ audit, label });
      byAuditId.set(auditId, list);
    }
  }

  const curatedOrder = CURATED_CAUSE_AUDIT_IDS[metricId];
  const orderedIds = [
    ...curatedOrder.filter((id) => byAuditId.has(id)),
    ...[...byAuditId.keys()].filter((id) => !curated.has(id)).sort(),
  ];

  return orderedIds.map((auditId) => {
    const entries = byAuditId.get(auditId)!;
    const primary = entries[0].audit;
    return {
      auditId,
      title: primary.title,
      description: primary.description,
      entries,
      maxSavings: maxSavingsForAcronym(entries, acronym),
    };
  });
}
