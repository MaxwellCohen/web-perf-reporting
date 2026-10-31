"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { shortUrl } from "@/features/page-speed-insights/shared/format";
import { getUrlString } from "@/lib/utils";

type SourceMapIssue = {
  scriptUrl: string;
  sourceMapUrl?: string;
  error: string;
  missingCount: number;
  reportLabels: string[];
};

const MISSING_COUNT_RE = /missing\s+(\d+)\s+items/i;

function missingCountFromError(error: string): number {
  const match = error.match(MISSING_COUNT_RE);
  return match ? Number(match[1]) || 0 : 0;
}

function extractIssues(rows: DetailTableItem[]): SourceMapIssue[] {
  const byScript = new Map<string, SourceMapIssue>();

  rows.forEach((row) => {
    const reportLabel = row._userLabel || "Report";
    (row.auditResult?.details?.items || []).forEach((item) => {
      const scriptUrl = getUrlString(item.scriptUrl);
      if (!scriptUrl) return;
      const sourceMapUrl = getUrlString(item.sourceMapUrl) || undefined;
      const errors = (item.subItems?.items || [])
        .map((sub) => (typeof sub.error === "string" ? sub.error.trim() : ""))
        .filter(Boolean);
      if (!errors.length && !sourceMapUrl) return;

      const missingCount = errors.reduce((sum, error) => sum + missingCountFromError(error), 0);
      const error = errors[0] || "Source map issue";
      const existing = byScript.get(scriptUrl);
      if (!existing) {
        byScript.set(scriptUrl, {
          scriptUrl,
          sourceMapUrl,
          error,
          missingCount,
          reportLabels: [reportLabel],
        });
        return;
      }

      if (!existing.sourceMapUrl && sourceMapUrl) existing.sourceMapUrl = sourceMapUrl;
      existing.missingCount = Math.max(existing.missingCount, missingCount);
      if (!existing.reportLabels.includes(reportLabel)) {
        existing.reportLabels.push(reportLabel);
      }
    });
  });

  return [...byScript.values()].sort(
    (a, b) => b.missingCount - a.missingCount || a.scriptUrl.localeCompare(b.scriptUrl),
  );
}

export function AuditSourceMapsViz({ rows }: { rows: DetailTableItem[] }) {
  const issues = extractIssues(rows);
  if (!issues.length) return null;

  return (
    <div className="w-full min-w-0 space-y-1.5">
      <p className="text-xs text-muted-foreground">
        {issues.length} script{issues.length === 1 ? "" : "s"} with source map issues
      </p>
      <ul className="divide-y overflow-hidden rounded-md border text-sm">
        {issues.map((issue) => (
          <li
            key={issue.scriptUrl}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-2.5 py-1.5"
          >
            <a
              href={issue.scriptUrl}
              target="_blank"
              rel="noreferrer"
              className="truncate text-primary hover:underline"
              title={issue.scriptUrl}
            >
              {shortUrl(issue.scriptUrl)}
            </a>
            {issue.missingCount > 0 ? (
              <span className="font-mono text-xs tabular-nums text-amber-700 dark:text-amber-300">
                {issue.missingCount} missing
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">issue</span>
            )}
            <p className="col-span-2 truncate text-xs text-muted-foreground" title={issue.error}>
              {issue.error}
              {issue.reportLabels.length > 1 ? ` · ${issue.reportLabels.join(", ")}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
