import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import { collectFcpScreenshots } from "@/features/page-speed-insights/fcpScreenshot";
import { collectLcpElements } from "@/features/page-speed-insights/lcpElement";
import {
  collectCauseAuditsForMetric,
  METRIC_AUDIT_IDS,
  METRIC_AUDIT_TO_ACRONYM,
  type CauseAuditEntry,
  type CwvMetricAcronym,
  type MetricAuditId,
  type MetricAuditSource,
} from "@/features/page-speed-insights/metricCauseAudits";

/** Accordion value of a metric section; also what the `open` query param stores. */
export function metricSectionKey(metricId: MetricAuditId): string {
  return `cwv-cause-${metricId}`;
}

/** DOM id of a metric section, the target of the metric jump links. */
export function metricSectionId(metricId: MetricAuditId): string {
  return `metric-${metricId}`;
}

/** `open` key and DOM id of a cause card. */
export function causeKey(auditId: string): string {
  return `cause-${auditId}`;
}

export const TIMELINE_KEY = "timeline";
export const TIMELINE_SHOTS_KEY = "timeline-shots";

/** Sections that are open before the reader touches anything. */
const BASE_OPEN = [
  TIMELINE_KEY,
  TIMELINE_SHOTS_KEY,
  "cwv",
  "loadingExperience",
  "originLoadingExperience",
];

/** Sections that only "Expand all" opens. */
const EXTRA_SECTIONS = ["Screenshots", "speedUpPrompt"];

/** Causes opened by default on a phone, where every open card costs a lot of scrolling. */
const NARROW_OPEN_CAUSES = 2;

export type OverviewMetric = {
  metricId: MetricAuditId;
  acronym: CwvMetricAcronym;
  /** Every cause of this metric, largest savings first. */
  causes: CauseAuditEntry[];
  /** Causes shown in full here: this is the first metric they affect. */
  own: CauseAuditEntry[];
  /** Causes shown in full under an earlier metric. */
  refs: Array<{ cause: CauseAuditEntry; home: MetricAuditId }>;
  /** False when the section has neither causes nor metric context to show. */
  hasSection: boolean;
};

export type OverviewModel = {
  metrics: OverviewMetric[];
  /** The metric section that shows each cause in full. */
  homeOf: Map<string, MetricAuditId>;
};

function hasContext(metricId: MetricAuditId, sources: MetricAuditSource[]): boolean {
  if (metricId === "first-contentful-paint") return collectFcpScreenshots(sources).length > 0;
  if (metricId === "largest-contentful-paint") return collectLcpElements(sources).length > 0;
  return false;
}

export function buildOverviewModel(sources: MetricAuditSource[]): OverviewModel {
  const homeOf = new Map<string, MetricAuditId>();
  const metrics = METRIC_AUDIT_IDS.map((metricId): OverviewMetric => {
    const causes = collectCauseAuditsForMetric(metricId, sources).sort(
      (a, b) => b.maxSavings - a.maxSavings,
    );
    for (const cause of causes) {
      if (!homeOf.has(cause.auditId)) homeOf.set(cause.auditId, metricId);
    }
    return {
      metricId,
      acronym: METRIC_AUDIT_TO_ACRONYM[metricId],
      causes,
      own: causes.filter((cause) => homeOf.get(cause.auditId) === metricId),
      refs: causes
        .filter((cause) => homeOf.get(cause.auditId) !== metricId)
        .map((cause) => ({ cause, home: homeOf.get(cause.auditId)! })),
      hasSection: causes.length > 0 || hasContext(metricId, sources),
    };
  });
  return { metrics, homeOf };
}

export type TopFix = {
  auditId: string;
  title: string;
  /** Largest time saving for the focused report, with the metric it applies to. */
  savingsMs: number;
  acronym: CwvMetricAcronym;
};

/** Causes with the largest estimated time savings for one report, largest first. */
export function rankTopFixes(model: OverviewModel, label: string, limit = 3): TopFix[] {
  const best = new Map<string, TopFix>();
  for (const metric of model.metrics) {
    // CLS savings are unitless, so they cannot be ranked against milliseconds.
    if (metric.acronym === "CLS") continue;
    for (const cause of metric.causes) {
      const audit = cause.entries.find((entry) => entry.label === label)?.audit;
      const savingsMs = audit?.metricSavings?.[metric.acronym] ?? 0;
      if (!(savingsMs > 0)) continue;
      const current = best.get(cause.auditId);
      if (!current || savingsMs > current.savingsMs) {
        best.set(cause.auditId, {
          auditId: cause.auditId,
          title: cause.title,
          savingsMs,
          acronym: metric.acronym,
        });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.savingsMs - a.savingsMs).slice(0, limit);
}

/**
 * Open keys before the reader changes anything: sections and causes with estimated
 * savings are open, diagnostics stay closed. A phone opens only the largest causes.
 */
export function defaultOpenKeys(model: OverviewModel, narrow: boolean): string[] {
  const withSavings = model.metrics.flatMap((metric) =>
    metric.own.filter((cause) => cause.maxSavings > 0).map((cause) => ({ metric, cause })),
  );
  const openCauses = narrow
    ? [...withSavings]
        // CLS savings are unitless and tiny; keep them behind the time savings.
        .sort(
          (a, b) =>
            Number(a.metric.acronym === "CLS") - Number(b.metric.acronym === "CLS") ||
            b.cause.maxSavings - a.cause.maxSavings,
        )
        .slice(0, NARROW_OPEN_CAUSES)
    : withSavings;
  const openSections = new Set(withSavings.map(({ metric }) => metric.metricId));

  return [
    ...BASE_OPEN,
    ...model.metrics
      .filter((metric) => openSections.has(metric.metricId))
      .map((metric) => metricSectionKey(metric.metricId)),
    ...openCauses.map(({ cause }) => causeKey(cause.auditId)),
  ];
}

/** Every key "Expand all" opens. */
export function allOpenKeys(model: OverviewModel): string[] {
  return [
    ...BASE_OPEN,
    ...EXTRA_SECTIONS,
    ...model.metrics
      .filter((metric) => metric.hasSection)
      .map((metric) => metricSectionKey(metric.metricId)),
    ...model.metrics.flatMap((metric) => metric.own.map((cause) => causeKey(cause.auditId))),
  ];
}

/** Reports that carry the audits the metric sections read. */
export function collectMetricSources(items: InsightsContextItem[]): MetricAuditSource[] {
  return items.flatMap(({ item, label }) => {
    const result = item.lighthouseResult;
    return result?.audits && result.categoryGroups ? [{ audits: result.audits, label }] : [];
  });
}
