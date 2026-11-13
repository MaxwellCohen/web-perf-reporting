import type { InsightsContextItem } from "@/lib/page-speed-insights/types";
import type { TableItem } from "@/lib/schema";

export function auditItems(audit: { details?: unknown } | undefined): TableItem[] {
  const details = audit?.details as { items?: unknown } | undefined;
  return Array.isArray(details?.items) ? (details.items as TableItem[]) : [];
}

export function entryAuditItems(entry: InsightsContextItem, auditId: string): TableItem[] {
  return auditItems(entry.item.lighthouseResult?.audits?.[auditId]);
}

export function finiteOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
