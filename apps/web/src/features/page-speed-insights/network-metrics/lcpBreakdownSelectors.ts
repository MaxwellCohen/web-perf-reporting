import { sortReportLabels } from "@/features/page-speed-insights/shared/reportLabels";
import { getNumber } from "@/lib/utils";

export type LCPBreakdownTableRow = {
  subpart: string;
  label: string;
  valuesByReportLabel: Record<string, number>;
};

// LCP subpart order (from first to last)
const LCP_SUBPART_ORDER = [
  "timeToFirstByte", // Time to First Byte (TTFB)
  "resourceLoadDelay", // Resource load delay
  "resourceLoadDuration", // Resource load duration
  "elementRenderDelay", // Element render delay
];

function sortSubparts<T extends { subpart: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aIndex = LCP_SUBPART_ORDER.indexOf(a.subpart);
    const bIndex = LCP_SUBPART_ORDER.indexOf(b.subpart);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

export function buildLcpBreakdownTableFromDetailRows(
  rows: Array<{
    _userLabel: string;
    auditResult?: {
      details?: {
        items?: Array<Record<string, unknown>>;
      };
    };
  }>,
): { tableRows: LCPBreakdownTableRow[]; reportLabels: string[] } | null {
  const subpartMap = new Map<string, LCPBreakdownTableRow>();

  rows.forEach((row) => {
    const reportLabel = row._userLabel;
    if (!reportLabel) return;

    (row.auditResult?.details?.items || []).forEach((item) => {
      const subpart = typeof item.subpart === "string" ? item.subpart : "";
      if (!subpart) return;

      if (!subpartMap.has(subpart)) {
        subpartMap.set(subpart, {
          subpart,
          label: typeof item.label === "string" ? item.label : subpart,
          valuesByReportLabel: {},
        });
      }

      const tableRow = subpartMap.get(subpart)!;
      tableRow.valuesByReportLabel[reportLabel] = getNumber(item.duration) || 0;
    });
  });

  const tableRows = sortSubparts(Array.from(subpartMap.values()));
  if (!tableRows.length) return null;

  return {
    tableRows,
    reportLabels: sortReportLabels(rows.map((row) => row._userLabel)),
  };
}
