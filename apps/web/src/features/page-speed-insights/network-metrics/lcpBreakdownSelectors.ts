import type { PageSpeedInsightsSnapshot } from "@/features/page-speed-insights/PageSpeedContext";
import { getNumber } from "@/lib/utils";

type LCPSubpart = {
  subpart: string;
  label: string;
  duration: number;
};

export type LCPBreakdownTableRow = {
  subpart: string;
  label: string;
  valuesByReportLabel: Record<string, number>;
};

export type LCPBreakdownComputed = {
  breakdownData: Array<{
    label: string;
    subparts: LCPSubpart[];
  }>;
  reportLabels: string[];
  allSubparts: string[];
  chartData: Array<Record<string, string | number>>;
  tableRows: LCPBreakdownTableRow[];
  chartHeight: number;
  subpartLabelBySubpart: Record<string, string>;
};

// LCP subpart order (from first to last)
const LCP_SUBPART_ORDER = [
  "timeToFirstByte", // Time to First Byte (TTFB)
  "resourceLoadDelay", // Resource load delay
  "resourceLoadDuration", // Resource load duration
  "elementRenderDelay", // Element render delay
];

let lastItemsRef: PageSpeedInsightsSnapshot["context"]["items"] | undefined;
let lastComputed: LCPBreakdownComputed | null = null;

function computeLcpBreakdownComputed(
  metrics: PageSpeedInsightsSnapshot["context"]["items"],
): LCPBreakdownComputed | null {
  const breakdownData = metrics
    .map(({ item, label }) => {
      const lcpBreakdownAudit = item?.lighthouseResult?.audits?.["lcp-breakdown-insight"];
      const details = lcpBreakdownAudit?.details as
        | { items?: Array<{ type?: string; items?: Array<Record<string, unknown>> }> }
        | undefined;

      // Find the table item in details
      const tableItem = details?.items?.find((table) => table.type === "table");
      const subparts = (tableItem?.items || []) as Array<{
        subpart?: string;
        label?: string;
        duration?: number | unknown;
      }>;

      return {
        label,
        subparts: subparts.map((subpart) => ({
          subpart: typeof subpart.subpart === "string" ? subpart.subpart : "",
          label: typeof subpart.label === "string" ? subpart.label : "",
          duration: getNumber(subpart.duration) || 0,
        })),
      };
    })
    .filter((data) => data.subparts.length > 0);

  if (!breakdownData.length) return null;

  // Sort & aggregate for the table
  const subpartMap = new Map<string, LCPBreakdownTableRow>();

  breakdownData.forEach(({ label, subparts }) => {
    subparts.forEach(({ subpart, label: subpartLabel, duration }) => {
      if (!subpartMap.has(subpart)) {
        subpartMap.set(subpart, {
          subpart,
          label: subpartLabel,
          valuesByReportLabel: {},
        });
      }

      const row = subpartMap.get(subpart)!;
      row.valuesByReportLabel[label] = duration;
    });
  });

  const tableRows = Array.from(subpartMap.values()).sort((a, b) => {
    const aIndex = LCP_SUBPART_ORDER.indexOf(a.subpart);
    const bIndex = LCP_SUBPART_ORDER.indexOf(b.subpart);
    // If not in order array, put at end
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Get all unique subparts for the chart, sorted by LCP subpart order
  const subpartSet = new Set<string>();
  breakdownData.forEach(({ subparts }) => {
    subparts.forEach(({ subpart }) => {
      if (subpart) subpartSet.add(subpart);
    });
  });

  const allSubparts = Array.from(subpartSet).sort((a, b) => {
    const aIndex = LCP_SUBPART_ORDER.indexOf(a);
    const bIndex = LCP_SUBPART_ORDER.indexOf(b);
    // If not in order array, put at end
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  // Create chart data - one bar per report, with subparts as stacked segments
  // Subparts must be added in the correct order for stacking
  const chartData = breakdownData.map(({ label, subparts }) => {
    const dataPoint: Record<string, string | number> = {
      report: label,
    };

    // Create a map for quick lookup
    const subpartMap = new Map(subparts.map((s) => [s.subpart, s.duration]));

    // Add each subpart in order (using allSubparts which is already sorted)
    allSubparts.forEach((subpart) => {
      dataPoint[subpart] = subpartMap.get(subpart) || 0;
    });

    return dataPoint;
  });

  const reportLabels = breakdownData.map((d) => d.label);

  // Calculate chart height based on number of reports (1rem per report + spacing)
  const barHeight = 16; // 1rem = 16px
  const spacing = 24; // spacing between bars (increased to prevent overlap)
  const topMargin = 12;
  const bottomMargin = 12;
  const chartHeight =
    breakdownData.length * barHeight +
    (breakdownData.length - 1) * spacing +
    topMargin +
    bottomMargin;

  // Map subpart keys to their labels for display
  const subpartLabelBySubpart: Record<string, string> = {};
  breakdownData.forEach(({ subparts }) => {
    subparts.forEach(({ subpart, label }) => {
      if (subpart && subpartLabelBySubpart[subpart] === undefined) {
        subpartLabelBySubpart[subpart] = label;
      }
    });
  });

  return {
    breakdownData,
    reportLabels,
    allSubparts,
    chartData,
    tableRows,
    chartHeight,
    subpartLabelBySubpart,
  };
}

export function selectLcpBreakdownComputed(
  snapshot: PageSpeedInsightsSnapshot,
): LCPBreakdownComputed | null {
  const items = snapshot.context.items;
  if (items === lastItemsRef) return lastComputed;

  lastItemsRef = items;
  lastComputed = computeLcpBreakdownComputed(items);
  return lastComputed;
}

