import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import type { OpportunityItem, TableItem } from "@/lib/schema";

export type DetailItem = TableItem | OpportunityItem;

export function reportLabel(row: DetailTableItem, index: number): string {
  return row._userLabel || `Report ${index + 1}`;
}

export function rowItems(row: DetailTableItem): DetailItem[] {
  const items = row.auditResult?.details?.items;
  return Array.isArray(items) ? (items as DetailItem[]) : [];
}

export function hasAnyItems(rows: DetailTableItem[]): boolean {
  return rows.some((row) => rowItems(row).length > 0);
}
