"use client";

import { AuditBarChart } from "./AuditBarChart";
import { extractBarPoints } from "./extractAuditBarPoints";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";

function isTotalRow(item: { resourceType?: unknown; label?: unknown } | Record<string, unknown>) {
  return (
    ("resourceType" in item && item.resourceType === "total") ||
    ("label" in item && item.label === "Total")
  );
}

export function AuditResourceSummaryViz({ rows }: { rows: DetailTableItem[] }) {
  const transferPoints = extractBarPoints(rows, {
    labelKeys: ["label", "resourceType"],
    valueKeys: ["transferSize"],
    skipWhen: isTotalRow,
    limit: 12,
  });
  const countPoints = extractBarPoints(rows, {
    labelKeys: ["label", "resourceType"],
    valueKeys: ["requestCount"],
    skipWhen: isTotalRow,
    limit: 12,
  });

  if (!transferPoints.length && !countPoints.length) return null;

  return (
    <div className="w-full min-w-0 space-y-4">
      {transferPoints.length ? (
        <AuditBarChart points={transferPoints} unit="bytes" title="Transfer size by type" />
      ) : null}
      {countPoints.length ? (
        <AuditBarChart points={countPoints} unit="count" title="Request count by type" />
      ) : null}
    </div>
  );
}
