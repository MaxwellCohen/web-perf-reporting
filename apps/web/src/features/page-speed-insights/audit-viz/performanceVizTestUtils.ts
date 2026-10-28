import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";

export function makeRow(
  id: string,
  items: Array<Record<string, unknown>>,
  label = "Mobile",
): DetailTableItem {
  return {
    _userLabel: label,
    auditResult: {
      id,
      details: { type: "table", headings: [], items: items as never },
    },
  };
}
