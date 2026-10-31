"use client";

import type { TableDataItem } from "@/features/page-speed-insights/tsTable/TableDataItem";
import {
  METRIC_AUDIT_IDS,
  type MetricAuditId,
} from "@/features/page-speed-insights/metricCauseAudits";
import { MetricValueViz } from "@/features/page-speed-insights/MetricValueViz";
import type { AuditResult } from "@/lib/schema";
import { AuditKpiStrip } from "./AuditKpiStrip";
import { extractDebugKpis } from "./extractAuditBarPoints";

const DIAGNOSTICS_KEYS = [
  { key: "numRequests", label: "Requests", format: "count" as const },
  { key: "numScripts", label: "Scripts", format: "count" as const },
  { key: "totalByteWeight", label: "Byte weight", format: "bytes" as const },
  { key: "throughput", label: "Throughput", format: "throughput" as const },
  { key: "maxRtt", label: "Max RTT", format: "ms" as const },
  { key: "maxServerLatency", label: "Max server latency", format: "ms" as const },
  { key: "totalTaskTime", label: "Task time", format: "ms" as const },
  { key: "mainDocumentTransferSize", label: "Document size", format: "bytes" as const },
];

const METRICS_KEYS = [
  { key: "firstContentfulPaint", label: "FCP", format: "ms" as const },
  { key: "largestContentfulPaint", label: "LCP", format: "ms" as const },
  { key: "totalBlockingTime", label: "TBT", format: "ms" as const },
  { key: "speedIndex", label: "Speed Index", format: "ms" as const },
  { key: "interactive", label: "TTI", format: "ms" as const },
  { key: "cumulativeLayoutShift", label: "CLS", format: "cls" as const },
  { key: "timeToFirstByte", label: "TTFB", format: "ms" as const },
  { key: "maxPotentialFID", label: "Max FID", format: "ms" as const },
];

const METRIC_AUDIT_ID_SET = new Set<string>(METRIC_AUDIT_IDS);

export function AuditDebugViz({ items }: { items: TableDataItem[] }) {
  const auditId = items[0]?.auditResult?.id;
  if (!auditId) return null;

  if (METRIC_AUDIT_ID_SET.has(auditId)) {
    const auditItems = items
      .filter((item) => item.auditResult)
      .map((item) => ({
        audit: item.auditResult as AuditResult,
        label: item._userLabel || "Report",
      }));
    return (
      <div className="mb-4 w-full min-w-0">
        <MetricValueViz auditId={auditId as MetricAuditId} auditItems={auditItems} detail={false} />
      </div>
    );
  }

  if (auditId === "diagnostics") {
    const groups = extractDebugKpis(items, DIAGNOSTICS_KEYS).map((group) => ({
      reportLabel: group.reportLabel,
      metrics: group.metrics.map((metric) => ({
        label: metric.label,
        value: metric.value,
        format: metric.format,
      })),
    }));
    return (
      <div className="mb-4">
        <AuditKpiStrip groups={groups} />
      </div>
    );
  }

  if (auditId === "metrics") {
    const groups = extractDebugKpis(items, METRICS_KEYS).map((group) => ({
      reportLabel: group.reportLabel,
      metrics: group.metrics.map((metric) => ({
        label: metric.label,
        value: metric.value,
        format: metric.format === "cls" ? ("cls" as const) : metric.format,
      })),
    }));
    return (
      <div className="mb-4">
        <AuditKpiStrip groups={groups} />
      </div>
    );
  }

  return null;
}
