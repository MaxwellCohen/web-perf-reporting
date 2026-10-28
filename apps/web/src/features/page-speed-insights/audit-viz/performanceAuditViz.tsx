"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { getAuditId } from "@/features/page-speed-insights/lh-categories/table/detailTableData";
import { AuditImageIssuesViz, IMAGE_ISSUE_AUDIT_IDS } from "./AuditImageIssuesViz";
import { AuditServerResponseTimeViz } from "./AuditServerResponseTimeViz";
import { AuditViewportViz } from "./AuditViewportViz";

export const PERFORMANCE_AUDIT_VIZ_IDS: ReadonlySet<string> = new Set([
  "server-response-time",
  "viewport-insight",
  ...IMAGE_ISSUE_AUDIT_IDS,
]);

export function PerformanceAuditViz({ rows }: { rows: DetailTableItem[] }) {
  const auditId = getAuditId(rows);
  if (!auditId) return null;

  switch (auditId) {
    case "server-response-time":
      return <AuditServerResponseTimeViz rows={rows} />;
    case "viewport-insight":
      return <AuditViewportViz rows={rows} />;
    default:
      return IMAGE_ISSUE_AUDIT_IDS.has(auditId) ? (
        <AuditImageIssuesViz rows={rows} auditId={auditId} />
      ) : null;
  }
}
