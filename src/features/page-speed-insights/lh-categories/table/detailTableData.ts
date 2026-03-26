import type { OpportunityItem, TableItem } from "@/lib/schema";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";

export type DetailTableDataRow = {
  item: TableItem | OpportunityItem;
  subitem?: TableItem;
  _userLabel: string;
};

export function getAuditId(rows: DetailTableItem[]): string | undefined {
  return rows[0]?.auditResult?.id;
}

export function hasDetailItems(rows: DetailTableItem[]): boolean {
  return rows.some((row) => (row.auditResult?.details?.items || []).length > 0);
}

export function hasDetailSubitems(rows: DetailTableItem[]): boolean {
  return rows.some((row) =>
    (row.auditResult?.details?.items || []).some((item) => (item.subItems?.items || []).length > 0),
  );
}

export function flattenDetailItems(rows: DetailTableItem[]): Array<TableItem | OpportunityItem> {
  return rows.flatMap((row) => row.auditResult?.details?.items || []);
}

export function flattenDetailRows(rows: DetailTableItem[]): DetailTableDataRow[] {
  return rows.flatMap((row) =>
    (row.auditResult?.details?.items || []).flatMap((item) => {
      const subitems = item.subItems?.items || [];

      if (!subitems.length) {
        return [
          {
            item,
            _userLabel: row._userLabel,
          },
        ];
      }

      return subitems.map((subitem) => ({
        item,
        subitem,
        _userLabel: row._userLabel,
      }));
    }),
  );
}

export function groupRowsByReportLabel(rows: DetailTableItem[]): Map<string, DetailTableItem[]> {
  return rows.reduce((groupedRows, row) => {
    const reportLabel = row._userLabel || "Unknown";
    const existingRows = groupedRows.get(reportLabel) || [];

    groupedRows.set(reportLabel, [...existingRows, row]);

    return groupedRows;
  }, new Map<string, DetailTableItem[]>());
}
