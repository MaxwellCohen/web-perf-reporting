import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { PSI_RUN_LABEL_SEPARATOR } from "@/lib/viewer/psiCompareLabels";

export const ALL_DEVICES_LABEL = "All Devices";

type ReportLabelGroup = "all-devices" | "mobile" | "desktop" | "other";

function splitRunPrefix(label: string): { run: string | null; rest: string } {
  const trimmed = label.trim();
  const index = trimmed.indexOf(PSI_RUN_LABEL_SEPARATOR);
  if (index <= 0) return { run: null, rest: trimmed };
  const run = trimmed.slice(0, index).trim();
  const rest = trimmed.slice(index + PSI_RUN_LABEL_SEPARATOR.length).trim();
  if (!run || !rest) return { run: null, rest: trimmed };
  return { run, rest };
}

function getReportLabelGroup(label: string): ReportLabelGroup {
  if (label.includes(ALL_DEVICES_LABEL)) {
    return "all-devices";
  }
  if (label.includes("Mobile")) {
    return "mobile";
  }
  if (label.includes("Desktop")) {
    return "desktop";
  }
  return "other";
}

export function normalizeReportLabel(label: string): string {
  const { rest } = splitRunPrefix(label);
  const target = rest || label;
  switch (getReportLabelGroup(target)) {
    case "all-devices":
      return ALL_DEVICES_LABEL;
    case "mobile":
      return "Mobile";
    case "desktop":
      return "Desktop";
    default:
      return target.trim();
  }
}

function compareFormFactorLabels(labelA: string, labelB: string): number {
  const groupOrder: Record<ReportLabelGroup, number> = {
    "all-devices": 0,
    mobile: 1,
    desktop: 2,
    other: 3,
  };

  const normalizedLabelA = normalizeReportLabel(labelA);
  const normalizedLabelB = normalizeReportLabel(labelB);
  const groupA = getReportLabelGroup(normalizedLabelA);
  const groupB = getReportLabelGroup(normalizedLabelB);

  if (groupA !== groupB) {
    return groupOrder[groupA] - groupOrder[groupB];
  }

  return normalizedLabelA.localeCompare(normalizedLabelB);
}

/**
 * Sort report labels by form factor. Labels from two run sets (run-prefixed)
 * are not reordered: they keep the order they were added in.
 */
export function compareReportLabels(
  labelA: string,
  labelB: string,
  _runOrder: string[] = [],
): number {
  const a = splitRunPrefix(labelA);
  const b = splitRunPrefix(labelB);

  if (a.run || b.run) {
    if (a.run && b.run) return 0;
    if (a.run && !b.run) return -1;
    if (!a.run && b.run) return 1;
  }

  return compareFormFactorLabels(labelA, labelB);
}

export function sortReportLabels(reportLabels: string[]): string[] {
  return [...reportLabels]
    .map(normalizeReportLabel)
    .filter(Boolean)
    .filter((label, index, labels) => labels.indexOf(label) === index)
    .sort(compareReportLabels);
}

export function formatReportLabelList(reportLabels: string[]): string {
  const sortedLabels = sortReportLabels(reportLabels);

  if (sortedLabels.length === 0) {
    return ALL_DEVICES_LABEL;
  }

  return sortedLabels.join(", ");
}

export function getCombinedReportLabel(reportLabels: string[]): string {
  if (reportLabels.length === 1) {
    return normalizeReportLabel(reportLabels[0] ?? "");
  }

  return ALL_DEVICES_LABEL;
}

/** Split a report label like "Run A · Mobile" into its run name (if any) and device. */
export function splitReportLabel(label: string): { run: string | null; device: string } {
  const { run } = splitRunPrefix(label);
  return { run, device: normalizeReportLabel(label) };
}

export function formatReportTableTitle(
  title: string,
  reportLabel: string,
  itemCount: number,
): string {
  const auditTitle = toTitleCase(title);
  const { run, device } = splitReportLabel(reportLabel);
  const formattedLabel = run ? `${run}${PSI_RUN_LABEL_SEPARATOR}${device}` : device;
  const itemLabel = itemCount === 1 ? "item" : "items";

  return `${auditTitle} Table for ${formattedLabel} (${itemCount} ${itemLabel})`;
}
