"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { cn } from "@/lib/utils";

type Severity = "high" | "medium" | "low" | "unknown";

type Finding = {
  id: string;
  description: string;
  directive?: string;
  severity: Severity;
  severityLabel: string;
  reportLabel: string;
};

const SEVERITY_ORDER: Record<Severity, number> = {
  high: 0,
  medium: 1,
  low: 2,
  unknown: 3,
};

function normalizeSeverity(raw: unknown): { severity: Severity; label: string } {
  const label = typeof raw === "string" && raw.trim() ? raw.trim() : "Unknown";
  const lower = label.toLowerCase();
  if (lower.startsWith("high")) return { severity: "high", label };
  if (lower.startsWith("medium") || lower.startsWith("moderate")) {
    return { severity: "medium", label };
  }
  if (lower.startsWith("low")) return { severity: "low", label };
  return { severity: "unknown", label };
}

function extractFindings(rows: DetailTableItem[]): Finding[] {
  const findings: Finding[] = [];

  rows.forEach((row, rowIndex) => {
    const reportLabel = row._userLabel || "Report";
    (row.auditResult?.details?.items || []).forEach((item, itemIndex) => {
      const description =
        typeof item.description === "string" && item.description.trim()
          ? item.description.trim()
          : "";
      if (!description) return;
      const directive =
        typeof item.directive === "string" && item.directive.trim()
          ? item.directive.trim()
          : undefined;
      const { severity, label } = normalizeSeverity(item.severity);
      findings.push({
        id: `${rowIndex}-${itemIndex}-${description}`,
        description,
        directive,
        severity,
        severityLabel: label,
        reportLabel,
      });
    });
  });

  return findings.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.description.localeCompare(b.description),
  );
}

const severityStyles: Record<Severity, string> = {
  high: "border-destructive/50 bg-destructive/10 text-destructive",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  low: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  unknown: "border-border bg-muted/40 text-muted-foreground",
};

const severityBar: Record<Severity, string> = {
  high: "bg-destructive",
  medium: "bg-amber-500",
  low: "bg-sky-500",
  unknown: "bg-muted-foreground",
};

export function AuditSeverityFindingsViz({ rows }: { rows: DetailTableItem[] }) {
  const findings = extractFindings(rows);
  if (!findings.length) return null;

  const multiReport = new Set(findings.map((finding) => finding.reportLabel)).size > 1;

  return (
    <div className="w-full min-w-0 space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Findings by severity</p>
      <ul className="space-y-2">
        {findings.map((finding) => (
          <li
            key={finding.id}
            className="relative overflow-hidden rounded-lg border bg-card/40 pl-3"
          >
            <span
              className={cn("absolute inset-y-0 left-0 w-1", severityBar[finding.severity])}
              aria-hidden
            />
            <div className="flex flex-wrap items-start justify-between gap-3 px-3 py-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm">{finding.description}</p>
                {finding.directive ? (
                  <code className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {finding.directive}
                  </code>
                ) : null}
                {multiReport ? (
                  <p className="text-xs text-muted-foreground">{finding.reportLabel}</p>
                ) : null}
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium uppercase tracking-wide",
                  severityStyles[finding.severity],
                )}
              >
                {finding.severityLabel}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const SECURITY_SEVERITY_AUDIT_IDS = new Set([
  "has-hsts",
  "csp-xss",
  "origin-isolation",
  "clickjacking-mitigation",
  "trusted-types-xss",
]);
