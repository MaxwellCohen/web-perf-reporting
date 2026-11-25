import type { AuditResult, TableItem } from "@/lib/schema";

export function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function str(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

export function tableItems(audit: AuditResult | undefined): TableItem[] {
  const details = audit?.details;
  return details && "items" in details && Array.isArray(details.items)
    ? (details.items as TableItem[])
    : [];
}

export function isUsable(audit: AuditResult | undefined): audit is AuditResult {
  return (
    !!audit && audit.scoreDisplayMode !== "notApplicable" && audit.scoreDisplayMode !== "manual"
  );
}
