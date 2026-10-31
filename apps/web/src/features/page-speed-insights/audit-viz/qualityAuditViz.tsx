"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { getAuditId } from "@/features/page-speed-insights/lh-categories/table/detailTableData";
import { AuditDeprecationsViz } from "./AuditDeprecationsViz";
import { AuditErrorsInConsoleViz } from "./AuditErrorsInConsoleViz";
import { AuditInspectorIssuesViz } from "./AuditInspectorIssuesViz";
import { AuditJsLibrariesViz } from "./AuditJsLibrariesViz";
import { AuditLinkTextViz } from "./AuditLinkTextViz";
import { AuditNodeFindingsViz, isNodeFindingsAudit } from "./AuditNodeFindingsViz";
import { AuditSeoProblemsViz, SEO_PROBLEM_AUDIT_IDS } from "./AuditSeoProblemsViz";
import { AuditThirdPartyCookiesViz } from "./AuditThirdPartyCookiesViz";

export function QualityAuditViz({ rows }: { rows: DetailTableItem[] }) {
  const auditId = getAuditId(rows);
  if (!auditId) return null;

  switch (auditId) {
    case "errors-in-console":
      return <AuditErrorsInConsoleViz rows={rows} />;
    case "third-party-cookies":
      return <AuditThirdPartyCookiesViz rows={rows} />;
    case "inspector-issues":
      return <AuditInspectorIssuesViz rows={rows} />;
    case "deprecations":
      return <AuditDeprecationsViz rows={rows} />;
    case "js-libraries":
      return <AuditJsLibrariesViz rows={rows} />;
    case "link-text":
      return <AuditLinkTextViz rows={rows} />;
    default:
      break;
  }

  if (SEO_PROBLEM_AUDIT_IDS.has(auditId)) return <AuditSeoProblemsViz rows={rows} />;
  if (isNodeFindingsAudit(rows, auditId)) return <AuditNodeFindingsViz rows={rows} />;
  return null;
}
